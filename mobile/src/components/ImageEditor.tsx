import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  PanResponder,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
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

type DragTarget = 'none' | 'move' | 'tl' | 'tr' | 'bl' | 'br';

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

export default function ImageEditor({ imageUri, visible, onComplete, onCancel }: ImageEditorProps) {
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

  // Processing
  const [processing, setProcessing] = useState(false);

  // Drag state refs (stable across re-renders for PanResponder)
  const dragTargetRef = useRef<DragTarget>('none');
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cropStartRef = useRef<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const imageLayoutRef = useRef(imageLayout);
  const cropRef = useRef(crop);
  const canvasOffsetRef = useRef({ x: 0, y: 0 });

  // Keep refs in sync
  useEffect(() => { imageLayoutRef.current = imageLayout; }, [imageLayout]);
  useEffect(() => { cropRef.current = crop; }, [crop]);

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

          // Default square crop centered in the image
          const side = Math.min(displayWidth, displayHeight);
          const cropX = (displayWidth - side) / 2;
          const cropY = (displayHeight - side) / 2;
          const cropRect: CropRect = { x: cropX, y: cropY, width: side, height: side };

          setCrop(cropRect);
          cropRef.current = cropRect;
          setDefaultCrop(cropRect);
        },
        () => {}
      );

      setFlipH(false);
      setFlipV(false);
      setRotation(0);
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
    return flipH || flipV || rotation !== 0 || isCropped();
  }, [flipH, flipV, rotation, isCropped]);

  const getDragTarget = (touchX: number, touchY: number): DragTarget => {
    const layout = imageLayoutRef.current;
    const c = cropRef.current;

    // Convert screen touch to image-relative coordinates
    // pageX/pageY are screen-absolute, so subtract canvas offset first
    const relX = touchX - canvasOffsetRef.current.x - layout.x;
    const relY = touchY - canvasOffsetRef.current.y - layout.y;

    const r = HANDLE_HIT_AREA;

    // Check corners first (higher priority)
    if (Math.abs(relX - c.x) < r && Math.abs(relY - c.y) < r) return 'tl';
    if (Math.abs(relX - (c.x + c.width)) < r && Math.abs(relY - c.y) < r) return 'tr';
    if (Math.abs(relX - c.x) < r && Math.abs(relY - (c.y + c.height)) < r) return 'bl';
    if (Math.abs(relX - (c.x + c.width)) < r && Math.abs(relY - (c.y + c.height)) < r) return 'br';

    // Check inside crop area for move
    if (relX >= c.x && relX <= c.x + c.width && relY >= c.y && relY <= c.y + c.height) return 'move';

    return 'none';
  };

  // Clamp crop to stay within image bounds and enforce square (1:1)
  const clampSquareCrop = (newCrop: CropRect): CropRect => {
    const layout = imageLayoutRef.current;
    let { x, y, width, height } = newCrop;

    // Enforce square: use the smaller dimension
    const side = Math.max(MIN_CROP_SIZE, Math.min(width, height, layout.width, layout.height));
    width = side;
    height = side;

    // Clamp position
    x = Math.max(0, Math.min(x, layout.width - side));
    y = Math.max(0, Math.min(y, layout.height - side));

    return { x, y, width: side, height: side };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        dragTargetRef.current = getDragTarget(pageX, pageY);
        dragStartRef.current = { x: pageX, y: pageY };
        cropStartRef.current = { ...cropRef.current };
        setIsDragging(dragTargetRef.current !== 'none');
      },
      onPanResponderMove: (evt) => {
        if (dragTargetRef.current === 'none') return;

        const { pageX, pageY } = evt.nativeEvent;
        const dx = pageX - dragStartRef.current.x;
        const dy = pageY - dragStartRef.current.y;
        const prev = cropStartRef.current;

        let newCrop: CropRect;

        switch (dragTargetRef.current) {
          case 'move':
            // Move the square crop without changing size
            newCrop = clampSquareCrop({
              x: prev.x + dx,
              y: prev.y + dy,
              width: prev.width,
              height: prev.height,
            });
            break;

          case 'tl': {
            // Drag top-left corner: use the dominant axis to resize square
            const delta = Math.max(dx, dy); // positive = shrink, negative = grow
            const newSide = Math.max(MIN_CROP_SIZE, prev.width - delta);
            // Anchor bottom-right corner
            const anchorRight = prev.x + prev.width;
            const anchorBottom = prev.y + prev.height;
            newCrop = clampSquareCrop({
              x: anchorRight - newSide,
              y: anchorBottom - newSide,
              width: newSide,
              height: newSide,
            });
            break;
          }

          case 'tr': {
            // Drag top-right corner
            const delta = Math.max(-dx, dy); // right=grow uses -dx, down=shrink uses dy
            const newSide = Math.max(MIN_CROP_SIZE, prev.width - delta);
            // Anchor bottom-left corner
            const anchorBottom = prev.y + prev.height;
            newCrop = clampSquareCrop({
              x: prev.x,
              y: anchorBottom - newSide,
              width: newSide,
              height: newSide,
            });
            break;
          }

          case 'bl': {
            // Drag bottom-left corner
            const delta = Math.max(dx, -dy); // right=shrink uses dx, up=shrink uses -dy
            const newSide = Math.max(MIN_CROP_SIZE, prev.width - delta);
            // Anchor top-right corner
            const anchorRight = prev.x + prev.width;
            newCrop = clampSquareCrop({
              x: anchorRight - newSide,
              y: prev.y,
              width: newSide,
              height: newSide,
            });
            break;
          }

          case 'br': {
            // Drag bottom-right corner
            const delta = Math.max(-dx, -dy); // left=shrink uses -dx, up=shrink uses -dy
            const newSide = Math.max(MIN_CROP_SIZE, prev.width - delta);
            // Anchor top-left corner
            newCrop = clampSquareCrop({
              x: prev.x,
              y: prev.y,
              width: newSide,
              height: newSide,
            });
            break;
          }

          default:
            return;
        }

        setCrop(newCrop);
        cropRef.current = newCrop;
      },
      onPanResponderRelease: () => {
        dragTargetRef.current = 'none';
        setIsDragging(false);
      },
    })
  ).current;

  const handleFlipH = () => setFlipH(prev => !prev);
  const handleFlipV = () => setFlipV(prev => !prev);
  const handleRotateLeft = () => setRotation(prev => (prev + 270) % 360);
  const handleRotateRight = () => setRotation(prev => (prev + 90) % 360);

  const handleReset = () => {
    setFlipH(false);
    setFlipV(false);
    setRotation(0);
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
      const scaleX = imageNaturalSize.width / imageLayout.width;
      const scaleY = imageNaturalSize.height / imageLayout.height;

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

  // Crop dimensions for display
  const scaleX = imageNaturalSize.width / imageLayout.width;
  const scaleY = imageNaturalSize.height / imageLayout.height;
  const cropPixelW = Math.round(crop.width * scaleX);
  const cropPixelH = Math.round(crop.height * scaleY);

  // Rule-of-thirds grid positions
  const thirdW = crop.width / 3;
  const thirdH = crop.height / 3;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity style={styles.topButton} onPress={onCancel}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.titleArea}>
            <Text style={styles.title}>Adjust Crop</Text>
            <Text style={styles.subtitle}>{cropPixelW} x {cropPixelH}</Text>
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
        <View
          style={styles.canvasArea}
          {...panResponder.panHandlers}
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
                left: imageLayout.x,
                top: imageLayout.y,
                width: imageLayout.width,
                height: imageLayout.height,
              },
              imageTransform.length > 0 ? { transform: imageTransform } : {},
            ]}
            resizeMode="contain"
          />

          {/* Dark overlays around crop region */}
          {/* Top strip */}
          <View style={[styles.darkOverlay, {
            left: imageLayout.x, top: imageLayout.y,
            width: imageLayout.width, height: crop.y,
          }]} />
          {/* Bottom strip */}
          <View style={[styles.darkOverlay, {
            left: imageLayout.x, top: imageLayout.y + crop.y + crop.height,
            width: imageLayout.width, height: imageLayout.height - crop.y - crop.height,
          }]} />
          {/* Left strip */}
          <View style={[styles.darkOverlay, {
            left: imageLayout.x, top: imageLayout.y + crop.y,
            width: crop.x, height: crop.height,
          }]} />
          {/* Right strip */}
          <View style={[styles.darkOverlay, {
            left: imageLayout.x + crop.x + crop.width, top: imageLayout.y + crop.y,
            width: imageLayout.width - crop.x - crop.width, height: crop.height,
          }]} />

          {/* Crop border */}
          <View
            style={[styles.cropBorder, {
              left: imageLayout.x + crop.x,
              top: imageLayout.y + crop.y,
              width: crop.width,
              height: crop.height,
            }]}
          />

          {/* Rule of thirds grid lines (always visible) */}
          {/* Vertical lines */}
          <View style={[styles.gridLine, {
            left: imageLayout.x + crop.x + thirdW,
            top: imageLayout.y + crop.y,
            width: StyleSheet.hairlineWidth,
            height: crop.height,
          }]} />
          <View style={[styles.gridLine, {
            left: imageLayout.x + crop.x + thirdW * 2,
            top: imageLayout.y + crop.y,
            width: StyleSheet.hairlineWidth,
            height: crop.height,
          }]} />
          {/* Horizontal lines */}
          <View style={[styles.gridLine, {
            left: imageLayout.x + crop.x,
            top: imageLayout.y + crop.y + thirdH,
            width: crop.width,
            height: StyleSheet.hairlineWidth,
          }]} />
          <View style={[styles.gridLine, {
            left: imageLayout.x + crop.x,
            top: imageLayout.y + crop.y + thirdH * 2,
            width: crop.width,
            height: StyleSheet.hairlineWidth,
          }]} />

          {/* L-shaped corner brackets */}
          <View style={{
            position: 'absolute',
            left: imageLayout.x + crop.x - CORNER_THICKNESS / 2,
            top: imageLayout.y + crop.y - CORNER_THICKNESS / 2,
          }}>
            <CornerBracket position="tl" />
          </View>
          <View style={{
            position: 'absolute',
            left: imageLayout.x + crop.x + crop.width - CORNER_LENGTH + CORNER_THICKNESS / 2,
            top: imageLayout.y + crop.y - CORNER_THICKNESS / 2,
          }}>
            <CornerBracket position="tr" />
          </View>
          <View style={{
            position: 'absolute',
            left: imageLayout.x + crop.x - CORNER_THICKNESS / 2,
            top: imageLayout.y + crop.y + crop.height - CORNER_LENGTH + CORNER_THICKNESS / 2,
          }}>
            <CornerBracket position="bl" />
          </View>
          <View style={{
            position: 'absolute',
            left: imageLayout.x + crop.x + crop.width - CORNER_LENGTH + CORNER_THICKNESS / 2,
            top: imageLayout.y + crop.y + crop.height - CORNER_LENGTH + CORNER_THICKNESS / 2,
          }}>
            <CornerBracket position="br" />
          </View>

          {/* "1:1" aspect ratio label */}
          <View style={[styles.aspectBadge, {
            left: imageLayout.x + crop.x + crop.width / 2 - 18,
            top: imageLayout.y + crop.y + crop.height - 28,
          }]}>
            <Text style={styles.aspectText}>1:1</Text>
          </View>
        </View>

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
      </View>
    </Modal>
  );
}

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
