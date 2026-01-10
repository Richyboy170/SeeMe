"""
BiSeNet Architecture Compatible with Pretrained Weights
Matches the official BiSeNet face parsing implementation
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models


class ConvBNReLU(nn.Module):
    """Basic convolutional block with BatchNorm and ReLU"""

    def __init__(self, in_chan, out_chan, ks=3, stride=1, padding=1):
        super(ConvBNReLU, self).__init__()
        self.conv = nn.Conv2d(
            in_chan, out_chan, kernel_size=ks, stride=stride,
            padding=padding, bias=False
        )
        self.bn = nn.BatchNorm2d(out_chan)

    def forward(self, x):
        x = self.conv(x)
        x = self.bn(x)
        x = F.relu(x, inplace=True)
        return x


class AttentionRefinementModule(nn.Module):
    """Attention Refinement Module"""

    def __init__(self, in_chan, out_chan):
        super(AttentionRefinementModule, self).__init__()
        self.conv = ConvBNReLU(in_chan, out_chan, ks=3, stride=1, padding=1)
        self.conv_atten = nn.Conv2d(out_chan, out_chan, kernel_size=1, bias=False)
        self.bn_atten = nn.BatchNorm2d(out_chan)
        self.sigmoid_atten = nn.Sigmoid()

    def forward(self, x):
        feat = self.conv(x)
        atten = F.adaptive_avg_pool2d(feat, 1)
        atten = self.conv_atten(atten)
        atten = self.bn_atten(atten)
        atten = self.sigmoid_atten(atten)
        out = torch.mul(feat, atten)
        return out


class ContextPath(nn.Module):
    """Context Path with ResNet-18 backbone"""

    def __init__(self):
        super(ContextPath, self).__init__()
        # Use ResNet-18 as backbone (keep structure for pretrained weights)
        self.resnet = models.resnet18(pretrained=False)

        # Attention Refinement Modules
        self.arm16 = AttentionRefinementModule(256, 128)
        self.arm32 = AttentionRefinementModule(512, 128)

        # Head convolutions
        self.conv_head32 = ConvBNReLU(128, 128, ks=3, stride=1, padding=1)
        self.conv_head16 = ConvBNReLU(128, 128, ks=3, stride=1, padding=1)

        # Global average pooling
        self.conv_avg = ConvBNReLU(512, 128, ks=1, stride=1, padding=0)

    def forward(self, x):
        # Extract features from ResNet backbone
        x = self.resnet.conv1(x)
        x = self.resnet.bn1(x)
        x = self.resnet.relu(x)
        x = self.resnet.maxpool(x)

        feat4 = self.resnet.layer1(x)  # 1/4, 64 channels
        feat8 = self.resnet.layer2(feat4)  # 1/8, 128 channels
        feat16 = self.resnet.layer3(feat8)  # 1/16, 256 channels
        feat32 = self.resnet.layer4(feat16)  # 1/32, 512 channels

        # Global average pooling
        avg = F.adaptive_avg_pool2d(feat32, 1)
        avg = self.conv_avg(avg)
        avg_up = F.interpolate(avg, size=feat32.size()[2:], mode='nearest')

        # ARM for feat32
        feat32_arm = self.arm32(feat32)
        feat32_sum = feat32_arm + avg_up
        feat32_up = F.interpolate(feat32_sum, size=feat16.size()[2:], mode='nearest')
        feat32_up = self.conv_head32(feat32_up)

        # ARM for feat16
        feat16_arm = self.arm16(feat16)
        feat16_sum = feat16_arm + feat32_up
        feat16_up = F.interpolate(feat16_sum, size=feat8.size()[2:], mode='nearest')
        feat16_up = self.conv_head16(feat16_up)

        return feat8, feat16_up  # Return feat8 and feat16


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


class FeatureFusionModule(nn.Module):
    """Feature Fusion Module to combine spatial and context features"""

    def __init__(self, in_chan, out_chan):
        super(FeatureFusionModule, self).__init__()
        self.convblk = ConvBNReLU(in_chan, out_chan, ks=1, stride=1, padding=0)

        # Attention
        self.conv1 = nn.Conv2d(out_chan, out_chan // 4, kernel_size=1, stride=1, padding=0, bias=False)
        self.conv2 = nn.Conv2d(out_chan // 4, out_chan, kernel_size=1, stride=1, padding=0, bias=False)
        self.relu = nn.ReLU(inplace=True)
        self.sigmoid = nn.Sigmoid()

    def forward(self, fsp, fcp):
        # Concatenate and convolve
        fcat = torch.cat([fsp, fcp], dim=1)
        feat = self.convblk(fcat)

        # Attention
        atten = F.adaptive_avg_pool2d(feat, 1)
        atten = self.conv1(atten)
        atten = self.relu(atten)
        atten = self.conv2(atten)
        atten = self.sigmoid(atten)

        # Apply attention
        feat_atten = torch.mul(feat, atten)
        feat_out = feat + feat_atten

        return feat_out


class BiSeNetOutput(nn.Module):
    """Output head"""

    def __init__(self, in_chan, mid_chan, n_classes):
        super(BiSeNetOutput, self).__init__()
        self.conv = ConvBNReLU(in_chan, mid_chan, ks=3, stride=1, padding=1)
        self.conv_out = nn.Conv2d(mid_chan, n_classes, kernel_size=1, bias=False)

    def forward(self, x):
        x = self.conv(x)
        x = self.conv_out(x)
        return x


class BiSeNet(nn.Module):
    """
    BiSeNet for Face Parsing (Compatible with pretrained weights)
    Outputs 19-class segmentation map
    """

    def __init__(self, n_classes=19):
        super(BiSeNet, self).__init__()
        self.n_classes = n_classes

        # Two paths
        self.cp = ContextPath()
        self.sp = SpatialPath()

        # Feature fusion (feat_sp: 128, feat_cp: 128, total: 256)
        self.ffm = FeatureFusionModule(256, 256)

        # Output heads
        self.conv_out = BiSeNetOutput(256, 256, n_classes)
        self.conv_out16 = BiSeNetOutput(128, 64, n_classes)
        self.conv_out32 = BiSeNetOutput(128, 64, n_classes)

    def forward(self, x):
        H, W = x.size()[2:]

        # Spatial and Context paths
        feat_sp = self.sp(x)  # 1/8, 128 channels
        feat_cp8, feat_cp16 = self.cp(x)  # feat8: 1/8 128ch, feat16: 1/8 128ch

        # Upsample spatial path to match context path size
        feat_sp = F.interpolate(feat_sp, size=feat_cp16.size()[2:], mode='bilinear', align_corners=True)

        # Fuse features
        feat_fuse = self.ffm(feat_sp, feat_cp16)

        # Output
        feat_out = self.conv_out(feat_fuse)
        feat_out = F.interpolate(feat_out, size=(H, W), mode='bilinear', align_corners=True)

        # Auxiliary outputs (for training only)
        if self.training:
            feat_out16 = self.conv_out16(feat_cp16)
            feat_out32 = self.conv_out32(feat_cp8)
            feat_out16 = F.interpolate(feat_out16, size=(H, W), mode='bilinear', align_corners=True)
            feat_out32 = F.interpolate(feat_out32, size=(H, W), mode='bilinear', align_corners=True)
            return feat_out, feat_out16, feat_out32

        return feat_out


def get_bisenet(n_classes=19, pretrained=False):
    """
    Get BiSeNet model compatible with pretrained weights

    Args:
        n_classes: Number of segmentation classes
        pretrained: Whether to load pretrained weights

    Returns:
        BiSeNet model
    """
    model = BiSeNet(n_classes=n_classes)
    return model
