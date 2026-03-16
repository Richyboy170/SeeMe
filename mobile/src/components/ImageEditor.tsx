import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HANDLE_HIT_AREA = 40;
const CORNER_LENGTH = 24;
const CORNER_THICKNESS = 3;
const MIN_CROP_SIZE = 80;

interface ImageEditorProps {
  imageUri: string;
  visible: boolean;
  onComplete: (croppedUri: string, originalUri: string, wasCropped: boolean) => void;
  onCancel: () => void;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_SCALE = 5;
const CROP_ASPECT = 4 / 3; // width:height matches feed post image display

type DragTarget = 'none' | 'move' | 'pan' | 'tl' | 'tr' | 'bl' | 'br';

// L-shaped corner bracket
const CornerBracket = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';

  return (
    <View style={{ width: CORNER_LENGTH, height: CORNER_LENGTH }}>
      {/* Horizontal bar */}
      <View
        style={{
          position: 'absolute',
          [isTop ? 'top' : 'bottom']: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: CORNER_LENGTH,
          height: CORNER_THICKNESS,
          backgroundColor: '#FFF',
          borderRadius: 1,
        }}
      />
      {/* Vertical bar */}
      <View
        style={{
          position: 'absolute',
          [isTop ? 'top' : 'bottom']: 0,
          [isLeft ? 'left' : 'right']: 0,
          width: CORNER_THICKNESS,
          height: CORNER_LENGTH,
          backgroundColor: '#FFF',
          borderRadius: 1,
        }}
      />
    </View>
  );
};

function ImageEditor({ imageUri, visible, onComplete, onCancel }: ImageEditorProps) {
  const insets = useSafeAreaInsets();

  // Image display dimensions (position on screen)
  const [imageLayout, setImageLayout] = useState({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_WIDTH });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 1, height: 1 });

  // Transforms
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Crop rectangle (in display coordinates relative to image top-left)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [defaultCrop, setDefaultCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Zoom/pan
  const [imageScale, setImageScale] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

  // Processing
  const [processing, setProcessing] = useState(false);

  // Drag state refs
  const dragTargetRef = useRef<DragTarget>('none');
  const cropStartRef = useRef<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const imageLayoutRef = useRef(imageLayout);
  const cropRef = useRef(crop);
  const canvasOffsetRef = useRef({ x: 0, y: 0 });
  const imageScaleRef = useRef(1);
  const imageOffsetRef = useRef({ x: 0, y: 0 });
  const pinchStartScaleRef = useRef(1);
  const pinchStartOffsetRef = useRef({ x: 0, y: 0 });
  const pinchFocalStartRef = useRef({ x: 0, y: 0 });
  const panStartOffsetRef = useRef({ x: 0, y: 0 });

  // Keep refs in sync
  useEffect(() => { imageLayoutRef.current = imageLayout; }, [imageLayout]);
  useEffect(() => { cropRef.current = crop; }, [crop]);
  useEffect(() => { imageScaleRef.current = imageScale; }, [imageScale]);
  useEffect(() => { imageOffsetRef.current = imageOffset; }, [imageOffset]);

  // Load image dimensions and set default centered square crop
  useEffect(() => {
    if (imageUri && visible) {
      Image.getSize(
        imageUri,
        (width, height) => {
          setImageNaturalSize({ width, height });

          // Available canvas space (between top bar and tools bar)
          const topBarHeight = insets.top + 60;
          const toolsBarHeight = 100 + insets.bottom;
          const canvasHeight = SCREEN_HEIGHT - topBarHeight - toolsBarHeight;
          const canvasWidth = SCREEN_WIDTH;

          const aspectRatio = width / height;
          let displayWidth: number, displayHeight: number;

          if (aspectRatio > canvasWidth / canvasHeight) {
            // Image is wider than canvas
            displayWidth = canvasWidth;
            displayHeight = canvasWidth / aspectRatio;
          } else {
            // Image is taller than canvas
            displayHeight = canvasHeight;
            displayWidth = canvasHeight * aspectRatio;
          }

          // Center the image in the canvas area (coordinates relative to canvasArea)
          const x = (SCREEN_WIDTH - displayWidth) / 2;
          const y = (canvasHeight - displayHeight) / 2;

          const layout = { x, y, width: displayWidth, height: displayHeight };
          setImageLayout(layout);
          imageLayoutRef.current = layout;

          // Default 4:3 crop centered in the image
          let cropW = displayWidth;
          let cropH = cropW / CROP_ASPECT;
          if (cropH > displayHeight) {
            cropH = displayHeight;
            cropW = cropH * CROP_ASPECT;
          }
          const cropX = (displayWidth - cropW) / 2;
          const cropY = (displayHeight - cropH) / 2;
          const cropRect: CropRect = { x: cropX, y: cropY, width: cropW, height: cropH };

          setCrop(cropRect);
          cropRef.current = cropRect;
          setDefaultCrop(cropRect);
        },
        () => {}
      );

      setFlipH(false);
      setFlipV(false);
      setRotation(0);
      setImageScale(1);
      imageScaleRef.current = 1;
      setImageOffset({ x: 0, y: 0 });
      imageOffsetRef.current = { x: 0, y: 0 };
    }
  }, [imageUri, visible]);

  const isCropped = useCallback(() => {
    const tolerance = 3;
    return (
      crop.width < imageLayout.width - tolerance ||
      crop.height < imageLayout.height - tolerance ||
      crop.x > tolerance ||
      crop.y > tolerance
    );
  }, [crop, imageLayout]);

  const hasTransforms = useCallback(() => {
    return flipH || flipV || rotation !== 0 || imageScale !== 1 || isCropped();
  }, [flipH, flipV, rotation, imageScale, isCropped]);

  const getRenderedBounds = (scale?: number, offset?: { x: number; y: number }) => {
    const base = imageLayoutRef.current;
    const s = scale ?? imageScaleRef.current;
    const off = offset ?? imageOffsetRef.current;
    const w = base.width * s;
    const h = base.height * s;
    return {
      x: base.x + off.x - (w - base.width) / 2,
      y: base.y + off.y - (h - base.height) / 2,
      width: w,
      height: h,
    };
  };

  const getDragTarget = (touchX: number, touchY: number): DragTarget => {
    const bounds = getRenderedBounds();
    const c = cropRef.current;

    const relX = touchX - canvasOffsetRef.current.x - bounds.x;
    const relY = touchY - canvasOffsetRef.current.y - bounds.y;

    const r = HANDLE_HIT_AREA;

    if (Math.abs(relX - c.x) < r && Math.abs(relY - c.y) < r) return 'tl';
    if (Math.abs(relX - (c.x + c.width)) < r && Math.abs(relY - c.y) < r) return 'tr';
    if (Math.abs(relX - c.x) < r && Math.abs(relY - (c.y + c.height)) < r) return 'bl';
    if (Math.abs(relX - (c.x + c.width)) < r && Math.abs(relY - (c.y + c.height)) < r) return 'br';

    if (relX >= c.x && relX <= c.x + c.width && relY >= c.y && relY <= c.y + c.height) return 'move';

    // When zoomed, allow panning the image by dragging outside the crop
    if (imageScaleRef.current > 1) return 'pan';

    return 'none';
  };

  // Clamp crop to stay within image bounds and enforce 4:3 aspect ratio
  const clampCrop = (newCrop: CropRect, bounds?: { width: number; height: number }): CropRect => {
    const b = bounds || getRenderedBounds();
    let { x, y, width } = newCrop;

    // Enforce 4:3 aspect ratio
    width = Math.max(MIN_CROP_SIZE, Math.min(width, b.width));
    let height = width / CROP_ASPECT;

    // If height exceeds bounds, scale down
    if (height > b.height) {
      height = b.height;
      width = height * CROP_ASPECT;
    }

    x = Math.max(0, Math.min(x, b.width - width));
    y = Math.max(0, Math.min(y, b.height - height));

    return { x, y, width, height };
  };

  // Pinch gesture for zoom
  const pinchGesture = useMemo(() => Gesture.Pinch()
    .runOnJS(true)
    .onStart((e) => {
      pinchStartScaleRef.current = imageScaleRef.current;
      pinchStartOffsetRef.current = { ...imageOffsetRef.current };
      pinchFocalStartRef.current = { x: e.focalX, y: e.focalY };
      dragTargetRef.current = 'none';
      setIsDragging(false);
    })
    .onUpdate((e) => {
      const oldBounds = getRenderedBounds(imageScaleRef.current, imageOffsetRef.current);
      const newScale = Math.max(1, Math.min(MAX_SCALE, pinchStartScaleRef.current * e.scale));

      // Pan from focal point movement
      const panDx = e.focalX - pinchFocalStartRef.current.x;
      const panDy = e.focalY - pinchFocalStartRef.current.y;
      const newOffset = {
        x: pinchStartOffsetRef.current.x + panDx,
        y: pinchStartOffsetRef.current.y + panDy,
      };

      const newBounds = getRenderedBounds(newScale, newOffset);

      // Recalculate crop to maintain screen position
      const c = cropRef.current;
      const screenCropX = oldBounds.x + c.x;
      const screenCropY = oldBounds.y + c.y;
      const newCrop = clampCrop({
        x: screenCropX - newBounds.x,
        y: screenCropY - newBounds.y,
        width: c.width,
        height: c.height,
      }, newBounds);

      setImageScale(newScale);
      imageScaleRef.current = newScale;
      setImageOffset(newOffset);
      imageOffsetRef.current = newOffset;
      setCrop(newCrop);
      cropRef.current = newCrop;
    })
    .onEnd(() => {
      if (imageScaleRef.current <= 1) {
        setImageScale(1);
        imageScaleRef.current = 1;
        setImageOffset({ x: 0, y: 0 });
        imageOffsetRef.current = { x: 0, y: 0 };
      }
    }), []);

  // Pan gesture for crop move/resize and image pan when zoomed
  const panGesture = useMemo(() => Gesture.Pan()
    .maxPointers(1)
    .runOnJS(true)
    .onStart((e) => {
      const target = getDragTarget(e.absoluteX, e.absoluteY);
      dragTargetRef.current = target;
      cropStartRef.current = { ...cropRef.current };
      panStartOffsetRef.current = { ...imageOffsetRef.current };
      setIsDragging(target !== 'none' && target !== 'pan');
    })
    .onUpdate((e) => {
      const dx = e.translationX;
      const dy = e.translationY;

      // Handle image pan when zoomed (1 finger outside crop)
      if (dragTargetRef.current === 'pan') {
        const newOffset = {
          x: panStartOffsetRef.current.x + dx,
          y: panStartOffsetRef.current.y + dy,
        };

        const startBounds = getRenderedBounds(imageScaleRef.current, panStartOffsetRef.current);
        const newBounds = getRenderedBounds(imageScaleRef.current, newOffset);

        const sc = cropStartRef.current;
        const screenCropX = startBounds.x + sc.x;
        const screenCropY = startBounds.y + sc.y;
        const newCrop = clampCrop({
          x: screenCropX - newBounds.x,
          y: screenCropY - newBounds.y,
          width: sc.width,
          height: sc.height,
        }, newBounds);

        setImageOffset(newOffset);
        imageOffsetRef.current = newOffset;
        setCrop(newCrop);
        cropRef.current = newCrop;
        return;
      }

      if (dragTargetRef.current === 'none') return;

      const prev = cropStartRef.current;
      const bounds = getRenderedBounds();

      let newCrop: CropRect;

      switch (dragTargetRef.current) {
        case 'move':
          newCrop = clampCrop({
            x: prev.x + dx,
            y: prev.y + dy,
            width: prev.width,
            height: prev.height,
          }, bounds);
          break;

        case 'tl': {
          const delta = Math.max(dx, dy * CROP_ASPECT);
          const newW = Math.max(MIN_CROP_SIZE, prev.width - delta);
          const anchorRight = prev.x + prev.width;
          const anchorBottom = prev.y + prev.height;
          newCrop = clampCrop({
            x: anchorRight - newW,
            y: anchorBottom - newW / CROP_ASPECT,
            width: newW,
            height: newW / CROP_ASPECT,
          }, bounds);
          break;
        }

        case 'tr': {
          const delta = Math.max(-dx, dy * CROP_ASPECT);
          const newW = Math.max(MIN_CROP_SIZE, prev.width - delta);
          const anchorBottom = prev.y + prev.height;
          newCrop = clampCrop({
            x: prev.x,
            y: anchorBottom - newW / CROP_ASPECT,
            width: newW,
            height: newW / CROP_ASPECT,
          }, bounds);
          break;
        }

        case 'bl': {
          const delta = Math.max(dx, -dy * CROP_ASPECT);
          const newW = Math.max(MIN_CROP_SIZE, prev.width - delta);
          const anchorRight = prev.x + prev.width;
          newCrop = clampCrop({
            x: anchorRight - newW,
            y: prev.y,
            width: newW,
            height: newW / CROP_ASPECT,
          }, bounds);
          break;
        }

        case 'br': {
          const delta = Math.max(-dx, -dy * CROP_ASPECT);
          const newW = Math.max(MIN_CROP_SIZE, prev.width - delta);
          newCrop = clampCrop({
            x: prev.x,
            y: prev.y,
            width: newW,
            height: newW / CROP_ASPECT,
          }, bounds);
          break;
        }

        default:
          return;
      }

      setCrop(newCrop);
      cropRef.current = newCrop;
    })
    .onEnd(() => {
      dragTargetRef.current = 'none';
      setIsDragging(false);
    }), []);

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture),
    [pinchGesture, panGesture]
  );

  const handleFlipH = () => setFlipH(prev => !prev);
  const handleFlipV = () => setFlipV(prev => !prev);
  const handleRotateLeft = () => setRotation(prev => (prev + 270) % 360);
  const handleRotateRight = () => setRotation(prev => (prev + 90) % 360);

  const handleReset = () => {
    setFlipH(false);
    setFlipV(false);
    setRotation(0);
    setImageScale(1);
    imageScaleRef.current = 1;
    setImageOffset({ x: 0, y: 0 });
    imageOffsetRef.current = { x: 0, y: 0 };
    setCrop(defaultCrop);
    cropRef.current = defaultCrop;
  };

  const handleSkip = () => {
    onComplete(imageUri, imageUri, false);
  };

  const handleDone = async () => {
    if (!hasTransforms()) {
      // Even if no visual transforms, the default square crop counts
      // Check if crop differs from full image
      const tolerance = 3;
      const isFullImage =
        crop.x < tolerance &&
        crop.y < tolerance &&
        Math.abs(crop.width - imageLayout.width) < tolerance &&
        Math.abs(crop.height - imageLayout.height) < tolerance;

      if (isFullImage) {
        onComplete(imageUri, imageUri, false);
        return;
      }
    }

    setProcessing(true);
    try {
      const actions: ImageManipulator.Action[] = [];

      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }
      if (flipH) {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
      if (flipV) {
        actions.push({ flip: ImageManipulator.FlipType.Vertical });
      }

      // Always apply crop (since we default to square)
      const rendered = getRenderedBounds();
      const scaleX = imageNaturalSize.width / rendered.width;
      const scaleY = imageNaturalSize.height / rendered.height;

      actions.push({
        crop: {
          originX: Math.round(crop.x * scaleX),
          originY: Math.round(crop.y * scaleY),
          width: Math.round(crop.width * scaleX),
          height: Math.round(crop.height * scaleY),
        },
      });

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      onComplete(result.uri, imageUri, true);
    } catch (error) {
      console.error('Image editor error:', error);
      onComplete(imageUri, imageUri, false);
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  const imageTransform: any[] = [];
  if (flipH) imageTransform.push({ scaleX: -1 });
  if (flipV) imageTransform.push({ scaleY: -1 });
  if (rotation !== 0) imageTransform.push({ rotate: `${rotation}deg` });

  // Rendered bounds accounting for zoom
  const renderedBounds = {
    x: imageLayout.x + imageOffset.x - (imageLayout.width * (imageScale - 1)) / 2,
    y: imageLayout.y + imageOffset.y - (imageLayout.height * (imageScale - 1)) / 2,
    width: imageLayout.width * imageScale,
    height: imageLayout.height * imageScale,
  };

  // Crop dimensions for display
  const scaleX = imageNaturalSize.width / renderedBounds.width;
  const scaleY = imageNaturalSize.height / renderedBounds.height;
  const cropPixelW = Math.round(crop.width * scaleX);
  const cropPixelH = Math.round(crop.height * scaleY);

  // Rule-of-thirds grid positions
  const thirdW = crop.width / 3;
  const thirdH = crop.height / 3;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity style={styles.topButton} onPress={onCancel}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.titleArea}>
            <Text style={styles.title}>Adjust Crop</Text>
            <Text style={styles.subtitle}>{cropPixelW} x {cropPixelH}{imageScale > 1 ? ` · ${imageScale.toFixed(1)}x` : ''}</Text>
          </View>

          <View style={styles.topRight}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.doneButton, processing && { opacity: 0.6 }]}
              onPress={handleDone}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.doneText}>Done</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Image canvas with crop overlay */}
        <GestureDetector gesture={composedGesture}>
        <View
          style={styles.canvasArea}
          onLayout={(e) => {
            const { x, y } = e.nativeEvent.layout;
            canvasOffsetRef.current = { x, y };
          }}
        >
          {/* Image */}
          <Image
            source={{ uri: imageUri }}
            style={[
              {
                position: 'absolute',
                left: renderedBounds.x,
                top: renderedBounds.y,
                width: renderedBounds.width,
                height: renderedBounds.height,
              },
              imageTransform.length > 0 ? { transform: imageTransform } : {},
            ]}
            resizeMode="contain"
          />

          {/* Dark overlays around crop region */}
          {/* Top strip */}
          <View style={[styles.darkOverlay, {
            left: renderedBounds.x, top: renderedBounds.y,
            width: renderedBounds.width, height: crop.y,
          }]} />
          {/* Bottom strip */}
          <View style={[styles.darkOverlay, {
            left: renderedBounds.x, top: renderedBounds.y + crop.y + crop.height,
            width: renderedBounds.width, height: renderedBounds.height - crop.y - crop.height,
          }]} />
          {/* Left strip */}
          <View style={[styles.darkOverlay, {
            left: renderedBounds.x, top: renderedBounds.y + crop.y,
            width: crop.x, height: crop.height,
          }]} />
          {/* Right strip */}
          <View style={[styles.darkOverlay, {
            left: renderedBounds.x + crop.x + crop.width, top: renderedBounds.y + crop.y,
            width: renderedBounds.width - crop.x - crop.width, height: crop.height,
          }]} />

          {/* Crop border */}
          <View
            style={[styles.cropBorder, {
              left: renderedBounds.x + crop.x,
              top: renderedBounds.y + crop.y,
              width: crop.width,
              height: crop.height,
            }]}
          />

          {/* Rule of thirds grid lines (always visible) */}
          {/* Vertical lines */}
          <View style={[styles.gridLine, {
            left: renderedBounds.x + crop.x + thirdW,
            top: renderedBounds.y + crop.y,
            width: StyleSheet.hairlineWidth,
            height: crop.height,
          }]} />
          <View style={[styles.gridLine, {
            left: renderedBounds.x + crop.x + thirdW * 2,
            top: renderedBounds.y + crop.y,
            width: StyleSheet.hairlineWidth,
            height: crop.height,
          }]} />
          {/* Horizontal lines */}
          <View style={[styles.gridLine, {
            left: renderedBounds.x + crop.x,
            top: renderedBounds.y + crop.y + thirdH,
            width: crop.width,
            height: StyleSheet.hairlineWidth,
          }]} />
          <View style={[styles.gridLine, {
            left: renderedBounds.x + crop.x,
            top: renderedBounds.y + crop.y + thirdH * 2,
            width: crop.width,
            height: StyleSheet.hairlineWidth,
          }]} />

          {/* L-shaped corner brackets */}
          <View style={{
            position: 'absolute',
            left: renderedBounds.x + crop.x - CORNER_THICKNESS / 2,
            top: renderedBounds.y + crop.y - CORNER_THICKNESS / 2,
          }}>
            <CornerBracket position="tl" />
          </View>
          <View style={{
            position: 'absolute',
            left: renderedBounds.x + crop.x + crop.width - CORNER_LENGTH + CORNER_THICKNESS / 2,
            top: renderedBounds.y + crop.y - CORNER_THICKNESS / 2,
          }}>
            <CornerBracket position="tr" />
          </View>
          <View style={{
            position: 'absolute',
            left: renderedBounds.x + crop.x - CORNER_THICKNESS / 2,
            top: renderedBounds.y + crop.y + crop.height - CORNER_LENGTH + CORNER_THICKNESS / 2,
          }}>
            <CornerBracket position="bl" />
          </View>
          <View style={{
            position: 'absolute',
            left: renderedBounds.x + crop.x + crop.width - CORNER_LENGTH + CORNER_THICKNESS / 2,
            top: renderedBounds.y + crop.y + crop.height - CORNER_LENGTH + CORNER_THICKNESS / 2,
          }}>
            <CornerBracket position="br" />
          </View>

          {/* "1:1" aspect ratio label */}
          <View style={[styles.aspectBadge, {
            left: renderedBounds.x + crop.x + crop.width / 2 - 18,
            top: renderedBounds.y + crop.y + crop.height - 28,
          }]}>
            <Text style={styles.aspectText}>4:3</Text>
          </View>
        </View>
        </GestureDetector>

        {/* Tools bar */}
        <View style={[styles.toolsBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={styles.toolButton} onPress={handleFlipH}>
            <View style={[styles.toolIconWrap, flipH && styles.toolIconActive]}>
              <Ionicons name="swap-horizontal" size={22} color={flipH ? '#000' : '#FFF'} />
            </View>
            <Text style={[styles.toolLabel, flipH && styles.toolLabelActive]}>Flip H</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleFlipV}>
            <View style={[styles.toolIconWrap, flipV && styles.toolIconActive]}>
              <Ionicons name="swap-vertical" size={22} color={flipV ? '#000' : '#FFF'} />
            </View>
            <Text style={[styles.toolLabel, flipV && styles.toolLabelActive]}>Flip V</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleRotateLeft}>
            <View style={styles.toolIconWrap}>
              <Ionicons name="arrow-undo" size={22} color="#FFF" />
            </View>
            <Text style={styles.toolLabel}>Rotate L</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleRotateRight}>
            <View style={styles.toolIconWrap}>
              <Ionicons name="arrow-redo" size={22} color="#FFF" />
            </View>
            <Text style={styles.toolLabel}>Rotate R</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleReset}>
            <View style={styles.toolIconWrap}>
              <Ionicons name="refresh" size={22} color="#FFF" />
            </View>
            <Text style={styles.toolLabel}>Reset</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default React.memo(ImageEditor);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  topButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleArea: {
    alignItems: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 1,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  doneButton: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    minWidth: 60,
    alignItems: 'center',
  },
  doneText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  canvasArea: {
    flex: 1,
    overflow: 'hidden',
  },
  darkOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  cropBorder: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  aspectBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aspectText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  toolsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 14,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
  },
  toolButton: {
    alignItems: 'center',
    gap: 5,
  },
  toolIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolIconActive: {
    backgroundColor: '#FBBF24',
  },
  toolLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
  toolLabelActive: {
    color: '#FBBF24',
  },
});
