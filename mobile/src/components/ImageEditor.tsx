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
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HANDLE_SIZE = 30;
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

export default function ImageEditor({ imageUri, visible, onComplete, onCancel }: ImageEditorProps) {
  const insets = useSafeAreaInsets();

  // Image display dimensions
  const [imageLayout, setImageLayout] = useState({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_WIDTH });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 1, height: 1 });

  // Transforms
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

  // Crop rectangle (in display coordinates relative to image)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [initialCrop, setInitialCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });

  // Processing
  const [processing, setProcessing] = useState(false);

  // Drag state
  const dragTarget = useRef<DragTarget>('none');
  const dragStart = useRef({ x: 0, y: 0 });
  const cropStart = useRef<CropRect>({ x: 0, y: 0, width: 0, height: 0 });

  // Load image dimensions
  useEffect(() => {
    if (imageUri && visible) {
      Image.getSize(
        imageUri,
        (width, height) => {
          setImageNaturalSize({ width, height });

          // Calculate display size (fit to canvas area)
          const canvasWidth = SCREEN_WIDTH;
          const canvasHeight = SCREEN_HEIGHT * 0.65;
          const canvasTop = insets.top + 50;

          const aspectRatio = width / height;
          let displayWidth: number, displayHeight: number;

          if (aspectRatio > canvasWidth / canvasHeight) {
            displayWidth = canvasWidth;
            displayHeight = canvasWidth / aspectRatio;
          } else {
            displayHeight = canvasHeight;
            displayWidth = canvasHeight * aspectRatio;
          }

          const x = (canvasWidth - displayWidth) / 2;
          const y = canvasTop + (canvasHeight - displayHeight) / 2;

          setImageLayout({ x, y, width: displayWidth, height: displayHeight });

          // Initialize crop to full image
          const cropRect = { x: 0, y: 0, width: displayWidth, height: displayHeight };
          setCrop(cropRect);
          setInitialCrop(cropRect);
        },
        () => {}
      );

      // Reset transforms
      setFlipH(false);
      setFlipV(false);
      setRotation(0);
    }
  }, [imageUri, visible]);

  const isCropped = useCallback(() => {
    const tolerance = 5;
    return (
      Math.abs(crop.x) > tolerance ||
      Math.abs(crop.y) > tolerance ||
      Math.abs(crop.width - imageLayout.width) > tolerance ||
      Math.abs(crop.height - imageLayout.height) > tolerance
    );
  }, [crop, imageLayout]);

  const hasTransforms = useCallback(() => {
    return flipH || flipV || rotation !== 0 || isCropped();
  }, [flipH, flipV, rotation, isCropped]);

  // Determine which drag target based on touch position
  const getDragTarget = (touchX: number, touchY: number): DragTarget => {
    const relX = touchX - imageLayout.x;
    const relY = touchY - imageLayout.y;

    const handleRadius = HANDLE_SIZE;
    const cx = crop.x;
    const cy = crop.y;
    const cw = crop.width;
    const ch = crop.height;

    // Check corners first
    if (Math.abs(relX - cx) < handleRadius && Math.abs(relY - cy) < handleRadius) return 'tl';
    if (Math.abs(relX - (cx + cw)) < handleRadius && Math.abs(relY - cy) < handleRadius) return 'tr';
    if (Math.abs(relX - cx) < handleRadius && Math.abs(relY - (cy + ch)) < handleRadius) return 'bl';
    if (Math.abs(relX - (cx + cw)) < handleRadius && Math.abs(relY - (cy + ch)) < handleRadius) return 'br';

    // Check if inside crop area
    if (relX >= cx && relX <= cx + cw && relY >= cy && relY <= cy + ch) return 'move';

    return 'none';
  };

  const clampCrop = (newCrop: CropRect): CropRect => {
    let { x, y, width, height } = newCrop;

    width = Math.max(MIN_CROP_SIZE, Math.min(width, imageLayout.width));
    height = Math.max(MIN_CROP_SIZE, Math.min(height, imageLayout.height));
    x = Math.max(0, Math.min(x, imageLayout.width - width));
    y = Math.max(0, Math.min(y, imageLayout.height - height));

    return { x, y, width, height };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touch = evt.nativeEvent;
        dragTarget.current = getDragTarget(touch.pageX, touch.pageY);
        dragStart.current = { x: touch.pageX, y: touch.pageY };
        cropStart.current = { ...crop };
      },
      onPanResponderMove: (evt) => {
        if (dragTarget.current === 'none') return;

        const touch = evt.nativeEvent;
        const dx = touch.pageX - dragStart.current.x;
        const dy = touch.pageY - dragStart.current.y;
        const prev = cropStart.current;

        let newCrop: CropRect;

        switch (dragTarget.current) {
          case 'move':
            newCrop = clampCrop({
              x: prev.x + dx,
              y: prev.y + dy,
              width: prev.width,
              height: prev.height,
            });
            break;
          case 'tl':
            newCrop = clampCrop({
              x: prev.x + dx,
              y: prev.y + dy,
              width: prev.width - dx,
              height: prev.height - dy,
            });
            break;
          case 'tr':
            newCrop = clampCrop({
              x: prev.x,
              y: prev.y + dy,
              width: prev.width + dx,
              height: prev.height - dy,
            });
            break;
          case 'bl':
            newCrop = clampCrop({
              x: prev.x + dx,
              y: prev.y,
              width: prev.width - dx,
              height: prev.height + dy,
            });
            break;
          case 'br':
            newCrop = clampCrop({
              x: prev.x,
              y: prev.y,
              width: prev.width + dx,
              height: prev.height + dy,
            });
            break;
          default:
            return;
        }

        setCrop(newCrop);
      },
      onPanResponderRelease: () => {
        dragTarget.current = 'none';
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
    setCrop(initialCrop);
  };

  const handleDone = async () => {
    if (!hasTransforms()) {
      onComplete(imageUri, imageUri, false);
      return;
    }

    setProcessing(true);
    try {
      const actions: ImageManipulator.Action[] = [];

      // Apply rotation
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // Apply flips
      if (flipH) {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
      if (flipV) {
        actions.push({ flip: ImageManipulator.FlipType.Vertical });
      }

      // Apply crop (convert display coordinates to image pixel coordinates)
      if (isCropped()) {
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
      }

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      onComplete(result.uri, imageUri, isCropped());
    } catch (error) {
      console.error('Image editor error:', error);
      onComplete(imageUri, imageUri, false);
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  // Image transform style for preview
  const imageTransform: any[] = [];
  if (flipH) imageTransform.push({ scaleX: -1 });
  if (flipV) imageTransform.push({ scaleY: -1 });
  if (rotation !== 0) imageTransform.push({ rotate: `${rotation}deg` });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <TouchableOpacity style={styles.topButton} onPress={onCancel}>
            <Text style={styles.topButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Photo</Text>
          <TouchableOpacity
            style={[styles.topButton, styles.doneButton]}
            onPress={handleDone}
            disabled={processing}
          >
            <Text style={[styles.topButtonText, styles.doneButtonText]}>
              {processing ? 'Saving...' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image canvas with crop overlay */}
        <View style={styles.canvasArea} {...panResponder.panHandlers}>
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
          {/* Top */}
          <View
            style={[
              styles.darkOverlay,
              {
                left: imageLayout.x,
                top: imageLayout.y,
                width: imageLayout.width,
                height: crop.y,
              },
            ]}
          />
          {/* Bottom */}
          <View
            style={[
              styles.darkOverlay,
              {
                left: imageLayout.x,
                top: imageLayout.y + crop.y + crop.height,
                width: imageLayout.width,
                height: imageLayout.height - crop.y - crop.height,
              },
            ]}
          />
          {/* Left */}
          <View
            style={[
              styles.darkOverlay,
              {
                left: imageLayout.x,
                top: imageLayout.y + crop.y,
                width: crop.x,
                height: crop.height,
              },
            ]}
          />
          {/* Right */}
          <View
            style={[
              styles.darkOverlay,
              {
                left: imageLayout.x + crop.x + crop.width,
                top: imageLayout.y + crop.y,
                width: imageLayout.width - crop.x - crop.width,
                height: crop.height,
              },
            ]}
          />

          {/* Crop border */}
          <View
            style={[
              styles.cropBorder,
              {
                left: imageLayout.x + crop.x,
                top: imageLayout.y + crop.y,
                width: crop.width,
                height: crop.height,
              },
            ]}
          />

          {/* Corner handles */}
          {[
            { key: 'tl', x: crop.x - HANDLE_SIZE / 2, y: crop.y - HANDLE_SIZE / 2 },
            { key: 'tr', x: crop.x + crop.width - HANDLE_SIZE / 2, y: crop.y - HANDLE_SIZE / 2 },
            { key: 'bl', x: crop.x - HANDLE_SIZE / 2, y: crop.y + crop.height - HANDLE_SIZE / 2 },
            { key: 'br', x: crop.x + crop.width - HANDLE_SIZE / 2, y: crop.y + crop.height - HANDLE_SIZE / 2 },
          ].map(handle => (
            <View
              key={handle.key}
              style={[
                styles.cornerHandle,
                {
                  left: imageLayout.x + handle.x,
                  top: imageLayout.y + handle.y,
                },
              ]}
            />
          ))}
        </View>

        {/* Tools bar */}
        <View style={styles.toolsBar}>
          <TouchableOpacity style={styles.toolButton} onPress={handleFlipH}>
            <Ionicons
              name="swap-horizontal"
              size={24}
              color={flipH ? '#FBBF24' : '#FFF'}
            />
            <Text style={[styles.toolLabel, flipH && styles.toolLabelActive]}>Flip H</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleFlipV}>
            <Ionicons
              name="swap-vertical"
              size={24}
              color={flipV ? '#FBBF24' : '#FFF'}
            />
            <Text style={[styles.toolLabel, flipV && styles.toolLabelActive]}>Flip V</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleRotateLeft}>
            <Ionicons name="arrow-undo" size={24} color="#FFF" />
            <Text style={styles.toolLabel}>-90°</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleRotateRight}>
            <Ionicons name="arrow-redo" size={24} color="#FFF" />
            <Text style={styles.toolLabel}>+90°</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleReset}>
            <Ionicons name="refresh" size={24} color="#FFF" />
            <Text style={styles.toolLabel}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom safe area */}
        <View style={{ height: insets.bottom + 10 }} />
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
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  topButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  topButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  doneButtonText: {
    fontWeight: '700',
  },
  canvasArea: {
    flex: 1,
  },
  darkOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFF',
    borderStyle: 'dashed',
  },
  cornerHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toolsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
  },
  toolButton: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
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
