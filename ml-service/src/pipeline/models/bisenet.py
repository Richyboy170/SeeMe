"""
BiSeNet (Bilateral Segmentation Network) for Face Parsing
19-class semantic segmentation model for facial regions
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBNReLU(nn.Module):
    """Basic convolutional block with BatchNorm and ReLU"""

    def __init__(self, in_chan, out_chan, ks=3, stride=1, padding=1):
        super(ConvBNReLU, self).__init__()
        self.conv = nn.Conv2d(
            in_chan, out_chan, kernel_size=ks, stride=stride,
            padding=padding, bias=False
        )
        self.bn = nn.BatchNorm2d(out_chan)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        x = self.conv(x)
        x = self.bn(x)
        x = self.relu(x)
        return x


class UpSample(nn.Module):
    """Upsampling block"""

    def __init__(self, n_chan, factor=2):
        super(UpSample, self).__init__()
        out_chan = n_chan * factor * factor
        self.proj = nn.Conv2d(n_chan, out_chan, 1, 1, 0)
        self.up = nn.PixelShuffle(factor)

    def forward(self, x):
        feat = self.proj(x)
        feat = self.up(feat)
        return feat


class SpatialPath(nn.Module):
    """Spatial Path for preserving spatial information"""

    def __init__(self):
        super(SpatialPath, self).__init__()
        self.conv1 = ConvBNReLU(3, 64, ks=7, stride=2, padding=3)
        self.conv2 = ConvBNReLU(64, 64, ks=3, stride=2, padding=1)
        self.conv3 = ConvBNReLU(64, 64, ks=3, stride=2, padding=1)
        self.conv_out = ConvBNReLU(64, 128, ks=1, stride=1, padding=0)

    def forward(self, x):
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.conv_out(x)
        return x


class ContextPath(nn.Module):
    """Context Path for semantic context"""

    def __init__(self):
        super(ContextPath, self).__init__()
        # Using ResNet-18 style backbone
        self.conv1 = ConvBNReLU(3, 64, ks=7, stride=2, padding=3)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)

        # Stage 2
        self.layer1 = self._make_layer(64, 64, 2)
        # Stage 3
        self.layer2 = self._make_layer(64, 128, 2, stride=2)
        # Stage 4
        self.layer3 = self._make_layer(128, 256, 2, stride=2)
        # Stage 5
        self.layer4 = self._make_layer(256, 512, 2, stride=2)

        # Global average pooling
        self.gap = nn.AdaptiveAvgPool2d(1)
        self.conv_gap = ConvBNReLU(512, 128, ks=1, stride=1, padding=0)

        # ARM (Attention Refinement Module)
        self.conv_last = ConvBNReLU(512, 128, ks=3, stride=1, padding=1)

    def _make_layer(self, in_chan, out_chan, blocks, stride=1):
        layers = []
        layers.append(ConvBNReLU(in_chan, out_chan, ks=3, stride=stride, padding=1))
        for i in range(1, blocks):
            layers.append(ConvBNReLU(out_chan, out_chan, ks=3, stride=1, padding=1))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.conv1(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        feat8 = self.layer3(x)
        feat16 = self.layer4(feat8)

        # Global context
        gap = self.gap(feat16)
        gap = self.conv_gap(gap)
        gap = F.interpolate(gap, size=feat16.size()[2:], mode='bilinear', align_corners=True)

        # Refined feature
        feat16 = self.conv_last(feat16)
        feat16 = feat16 + gap

        return feat8, feat16


class FeatureFusionModule(nn.Module):
    """Feature Fusion Module to combine spatial and context features"""

    def __init__(self, in_chan, out_chan):
        super(FeatureFusionModule, self).__init__()
        self.convblk = ConvBNReLU(in_chan, out_chan, ks=1, stride=1, padding=0)

        # Attention
        self.gap = nn.AdaptiveAvgPool2d(1)
        self.conv1 = nn.Conv2d(out_chan, out_chan // 4, kernel_size=1, stride=1, padding=0)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(out_chan // 4, out_chan, kernel_size=1, stride=1, padding=0)
        self.sigmoid = nn.Sigmoid()

    def forward(self, fsp, fcp):
        # Concatenate and convolve
        fcat = torch.cat([fsp, fcp], dim=1)
        feat = self.convblk(fcat)

        # Attention
        atten = self.gap(feat)
        atten = self.conv1(atten)
        atten = self.relu(atten)
        atten = self.conv2(atten)
        atten = self.sigmoid(atten)

        # Apply attention
        feat_atten = feat * atten
        feat_out = feat + feat_atten

        return feat_out


class BiSeNet(nn.Module):
    """
    BiSeNet for Face Parsing
    Outputs 19-class segmentation map
    """

    def __init__(self, n_classes=19):
        super(BiSeNet, self).__init__()
        self.n_classes = n_classes

        # Two paths
        self.cp = ContextPath()
        self.sp = SpatialPath()

        # Feature fusion
        # Input: feat_sp (128) + feat_cp8 (256) + feat_cp16 (128) = 512 channels
        self.ffm = FeatureFusionModule(512, 256)

        # Output head
        self.conv_out = nn.Conv2d(256, n_classes, kernel_size=1, stride=1, padding=0)
        self.conv_out16 = nn.Conv2d(128, n_classes, kernel_size=1, stride=1, padding=0)
        self.conv_out32 = nn.Conv2d(128, n_classes, kernel_size=1, stride=1, padding=0)

    def forward(self, x):
        H, W = x.size()[2:]

        # Spatial and Context paths
        feat_sp = self.sp(x)  # 1/8
        feat_cp8, feat_cp16 = self.cp(x)  # 1/8, 1/16

        # Upsample context features
        feat_cp8 = F.interpolate(feat_cp8, size=feat_sp.size()[2:], mode='bilinear', align_corners=True)
        feat_cp16 = F.interpolate(feat_cp16, size=feat_sp.size()[2:], mode='bilinear', align_corners=True)

        # Fuse features
        feat_fuse = self.ffm(feat_sp, torch.cat([feat_cp8, feat_cp16], dim=1))

        # Output
        feat_out = self.conv_out(feat_fuse)
        feat_out = F.interpolate(feat_out, size=(H, W), mode='bilinear', align_corners=True)

        # Auxiliary outputs (for training only)
        if self.training:
            feat_out16 = self.conv_out16(feat_cp8)
            feat_out32 = self.conv_out32(feat_cp16)
            feat_out16 = F.interpolate(feat_out16, size=(H, W), mode='bilinear', align_corners=True)
            feat_out32 = F.interpolate(feat_out32, size=(H, W), mode='bilinear', align_corners=True)
            return feat_out, feat_out16, feat_out32

        return feat_out


def get_bisenet(n_classes=19, pretrained=False):
    """
    Get BiSeNet model

    Args:
        n_classes: Number of segmentation classes
        pretrained: Whether to load pretrained weights

    Returns:
        BiSeNet model
    """
    model = BiSeNet(n_classes=n_classes)
    return model
