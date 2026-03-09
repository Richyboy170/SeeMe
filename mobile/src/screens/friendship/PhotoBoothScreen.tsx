import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { friendshipSocket } from '../../services/friendshipSocket';
import PoseOverlay from '../../components/friendship/PoseOverlay';
import PoseGuideCard from '../../components/friendship/PoseGuideCard';
import { FriendshipMeetupStackParamList } from '../../navigation/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type PhotoBoothRouteProp = RouteProp<FriendshipMeetupStackParamList, 'PhotoBooth'>;

export default function PhotoBoothScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<PhotoBoothRouteProp>();
  const { sessionId, poses, isHost } = route.params;
  const [permission] = useCameraPermissions();

  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [phase, setPhase] = useState<'guide' | 'camera' | 'countdown' | 'flash' | 'transition'>('guide');
  const [matchScore, setMatchScore] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const [leftPersonMatched, setLeftPersonMatched] = useState(false);
  const [rightPersonMatched, setRightPersonMatched] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(2);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  // DEV ONLY: extra people count to fake 2-person detection — REMOVE BEFORE PRODUCTION
  const [devExtraPeople, setDevExtraPeople] = useState(0);
  const devExtraPeopleRef = useRef(0);
  const [partnerInfo, setPartnerInfo] = useState<{ username: string; userId: string }>({ username: 'friend', userId: '' });
  const cameraRef = useRef<any>(null);
  const validationInterval = useRef<NodeJS.Timeout | null>(null);
  const guideOpacity = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const countdownScale = useRef(new Animated.Value(0.5)).current;

  const currentPose = poses[currentPoseIndex];

  // Fetch session to get partner info
  useEffect(() => {
    const fetchPartner = async () => {
      try {
        const result = await api.getFriendshipSession(sessionId);
        if (result.success && result.session) {
          const session = result.session;
          // If we're the host, partner is the guest; otherwise partner is the host
          const partner = isHost ? session.guest : session.host;
          if (partner) {
            setPartnerInfo({ username: partner.username, userId: partner.id });
          }
        }
      } catch (err) {
        console.error('Error fetching session partner:', err);
      }
    };
    fetchPartner();
  }, [sessionId, isHost]);

  // Show guide card for 2 seconds, then switch to camera
  useEffect(() => {
    if (phase === 'guide') {
      const timer = setTimeout(() => {
        Animated.timing(guideOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setPhase('camera');
          guideOpacity.setValue(1);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, currentPoseIndex]);

  // === HOST: Periodic pose validation via vision service ===
  useEffect(() => {
    if (phase !== 'camera' || !isHost || isMatched) return;

    let cancelled = false;

    const validateFrame = async () => {
      if (cancelled || !cameraRef.current) return;

      try {
        const snapshot = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
        });
        if (cancelled || !snapshot?.uri) return;

        const result = await api.validateFriendshipPose(
          sessionId, snapshot.uri, currentPose, 2
        );
        if (cancelled) return;

        if (result.success && result.details?.error !== 'vision_service_unavailable') {
          const score = result.pose_match_score ?? 0;
          // DEV: devExtraPeopleRef adds virtual people to the detected count
          const detected = (result.people_detected ?? 0) + devExtraPeopleRef.current;
          setMatchScore(score);

          // Per-person feedback
          setLeftPersonMatched(detected >= 1);
          setRightPersonMatched(detected >= 2);

          // Match: need 2 people detected with score > 0.25
          // DEV: skip score threshold when +1 person is active
          const scoreOk = devExtraPeopleRef.current > 0 ? score >= 0 : score > 0.25;
          if (scoreOk && detected >= 2 && !cancelled) {
            setIsMatched(true);
            setLeftPersonMatched(true);
            setRightPersonMatched(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (validationInterval.current) clearInterval(validationInterval.current);
            setTimeout(() => startCountdown(), 500);
          }
        }
      } catch {
        // Vision service call failed, will retry on next interval
      }
    };

    validationInterval.current = setInterval(validateFrame, 1500);
    validateFrame();

    return () => {
      cancelled = true;
      if (validationInterval.current) clearInterval(validationInterval.current);
    };
  }, [phase, isMatched, currentPose, isHost]);


  const startCountdown = useCallback(() => {
    setPhase('countdown');

    // Host broadcasts countdown to guest
    if (isHost) {
      friendshipSocket.startCountdown(sessionId, currentPoseIndex);
    }

    setCountdownNumber(2);
    countdownScale.setValue(0.5);
    Animated.spring(countdownScale, { toValue: 1, useNativeDriver: true }).start();

    setTimeout(() => {
      setCountdownNumber(1);
      countdownScale.setValue(0.5);
      Animated.spring(countdownScale, { toValue: 1, useNativeDriver: true }).start();

      setTimeout(() => {
        if (isHost) {
          capturePhoto();
        } else {
          // Guest just shows flash effect, no capture
          onCaptureEffect();
        }
      }, 1000);
    }, 1000);
  }, [currentPoseIndex, isHost, sessionId]);

  // === GUEST: Listen for countdown from host ===
  useEffect(() => {
    if (isHost) return;
    const unsub = friendshipSocket.onCountdown((data) => {
      if (data.sessionId === sessionId) {
        startCountdown();
      }
    });
    return unsub;
  }, [sessionId, isHost, startCountdown]);

  // === GUEST: Listen for pose transitions from host ===
  useEffect(() => {
    if (isHost) return;

    const unsubPose = friendshipSocket.onPoseComplete((data) => {
      if (data.sessionId === sessionId) {
        setPhase('transition');
        setTimeout(() => {
          setCurrentPoseIndex(data.nextPoseIndex);
          setMatchScore(0);
          setIsMatched(false);
          setLeftPersonMatched(false);
          setRightPersonMatched(false);
          setPhase('guide');
        }, 1500);
      }
    });

    const unsubDone = friendshipSocket.onAllPosesComplete((data) => {
      if (data.sessionId === sessionId) {
        setTimeout(() => {
          navigation.replace('PhotoStrip', {
            sessionId,
            photos: [],
            poses,
            partnerUsername: partnerInfo.username,
            partnerUserId: partnerInfo.userId || undefined,
          });
        }, 500);
      }
    });

    return () => {
      unsubPose();
      unsubDone();
    };
  }, [sessionId, isHost, poses, navigation]);

  // Guest-only: flash + haptic effect without capturing
  const onCaptureEffect = () => {
    setPhase('flash');
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  // === HOST ONLY: Capture + upload photo ===
  const capturePhoto = async () => {
    setPhase('flash');
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    let photoUri = '';
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        photoUri = photo.uri;
      }
    } catch (err) {
      console.error('Camera capture error:', err);
    }

    const newPhotos = [...capturedPhotos, photoUri];
    setCapturedPhotos(newPhotos);

    // Upload photo to backend
    try {
      if (photoUri) {
        await api.submitFriendshipPhoto(sessionId, photoUri, currentPoseIndex, currentPose);
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    }

    // Signal pose done to guest
    friendshipSocket.poseDone(sessionId, currentPoseIndex);

    // Check if all poses done
    if (currentPoseIndex >= poses.length - 1) {
      friendshipSocket.allDone(sessionId);

      setTimeout(() => {
        navigation.replace('PhotoStrip', {
          sessionId,
          photos: newPhotos,
          poses,
          partnerUsername: partnerInfo.username,
          partnerUserId: partnerInfo.userId || undefined,
        });
      }, 500);
    } else {
      // Transition to next pose
      setPhase('transition');
      setTimeout(() => {
        setCurrentPoseIndex(prev => prev + 1);
        setMatchScore(0);
        setIsMatched(false);
        setLeftPersonMatched(false);
        setRightPersonMatched(false);
        setPhase('guide');
      }, 1500);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationInterval.current) clearInterval(validationInterval.current);
      friendshipSocket.removeAllListeners();
    };
  }, []);

  // ========================
  // HOST VIEW: Full camera with pose validation
  // ========================
  if (isHost) {
    if (!permission?.granted) {
      return (
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.permText, { color: colors.text.primary }]}>Camera permission required</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />

        {(phase === 'camera' || phase === 'countdown') && (
          <>
            <PoseOverlay
              poseName={currentPose}
              matchScore={matchScore}
              isMatched={isMatched}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              leftPersonMatched={leftPersonMatched}
              rightPersonMatched={rightPersonMatched}
            />
          </>
        )}

        {phase === 'guide' && (
          <View style={styles.guideOverlay}>
            <PoseGuideCard
              poseName={currentPose}
              poseIndex={currentPoseIndex}
              totalPoses={poses.length}
              opacity={guideOpacity}
            />
          </View>
        )}

        {phase === 'countdown' && (
          <View style={styles.countdownOverlay}>
            <Animated.Text style={[styles.countdownText, { transform: [{ scale: countdownScale }] }]}>
              {countdownNumber}
            </Animated.Text>
          </View>
        )}

        <Animated.View
          style={[styles.flash, { opacity: flashOpacity }]}
          pointerEvents="none"
        />

        {phase === 'transition' && (
          <View style={[styles.transitionOverlay, { backgroundColor: colors.background }]}>
            <Text style={styles.transitionEmoji}>✨</Text>
            <Text style={[styles.transitionText, { color: colors.text.primary }]}>Great shot!</Text>
            <Text style={[styles.transitionSubtext, { color: colors.text.secondary }]}>
              Pose {currentPoseIndex + 1} of {poses.length} complete
            </Text>
          </View>
        )}

        {/* Host badge */}
        <View style={styles.roleBadge}>
          <Ionicons name="camera" size={14} color="#FFF" />
          <Text style={styles.roleBadgeText}>Main Camera</Text>
        </View>

        <View style={styles.progressBar}>
          {poses.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                {
                  backgroundColor: i < currentPoseIndex
                    ? '#4CD964'
                    : i === currentPoseIndex
                      ? colors.text.link
                      : 'rgba(255,255,255,0.3)',
                },
              ]}
            />
          ))}
        </View>

        {/* DEV ONLY: +1 person button — REMOVE BEFORE PRODUCTION */}
        {phase === 'camera' && (
          <View style={styles.devPeopleRow}>
            <TouchableOpacity
              style={[styles.devPeopleBtn, devExtraPeople > 0 && styles.devPeopleBtnActive]}
              onPress={() => {
                const next = devExtraPeople === 0 ? 1 : 0;
                devExtraPeopleRef.current = next;
                setDevExtraPeople(next);
              }}
            >
              <Ionicons name="person-add" size={16} color="#FFF" />
              <Text style={styles.devPeopleBtnText}>
                {devExtraPeople > 0 ? `+${devExtraPeople} person` : '+1 person'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ========================
  // GUEST VIEW: Companion screen (no camera, synced with host)
  // ========================
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Pose guide for guest */}
      {phase === 'guide' && (
        <View style={[styles.guestCenter]}>
          <PoseGuideCard
            poseName={currentPose}
            poseIndex={currentPoseIndex}
            totalPoses={poses.length}
            opacity={guideOpacity}
          />
        </View>
      )}

      {/* Waiting for host to match pose */}
      {phase === 'camera' && (
        <View style={[styles.guestCenter]}>
          <Ionicons name="camera-outline" size={64} color={colors.text.tertiary} style={{ marginBottom: 20 }} />
          <Text style={[styles.guestPoseName, { color: colors.text.primary }]}>
            {currentPose.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Text>
          <Text style={[styles.guestHint, { color: colors.text.secondary }]}>
            Get into position!
          </Text>
          <Text style={[styles.guestSubhint, { color: colors.text.tertiary }]}>
            Your friend's phone is the camera
          </Text>
          <ActivityIndicator
            size="small"
            color={colors.text.link}
            style={{ marginTop: 24 }}
          />
        </View>
      )}

      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <View style={[styles.guestCenter, { backgroundColor: colors.background }]}>
          <Animated.Text style={[styles.countdownText, { color: colors.text.primary, transform: [{ scale: countdownScale }] }]}>
            {countdownNumber}
          </Animated.Text>
        </View>
      )}

      {/* Flash effect */}
      <Animated.View
        style={[styles.flash, { opacity: flashOpacity }]}
        pointerEvents="none"
      />

      {/* Transition between poses */}
      {phase === 'transition' && (
        <View style={[styles.guestCenter, { backgroundColor: colors.background }]}>
          <Text style={styles.transitionEmoji}>✨</Text>
          <Text style={[styles.transitionText, { color: colors.text.primary }]}>Great shot!</Text>
          <Text style={[styles.transitionSubtext, { color: colors.text.secondary }]}>
            Pose {currentPoseIndex + 1} of {poses.length} complete
          </Text>
        </View>
      )}

      {/* Guest badge */}
      <View style={[styles.roleBadge, { backgroundColor: 'rgba(100,100,100,0.8)' }]}>
        <Ionicons name="person" size={14} color="#FFF" />
        <Text style={styles.roleBadgeText}>Partner</Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { top: 100 }]}>
        {poses.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor: i < currentPoseIndex
                  ? '#4CD964'
                  : i === currentPoseIndex
                    ? colors.text.link
                    : 'rgba(150,150,150,0.3)',
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  permText: {
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  transitionText: {
    fontSize: 28,
    fontWeight: '800',
  },
  transitionSubtext: {
    fontSize: 16,
    marginTop: 8,
  },
  progressBar: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 40,
    height: 6,
    borderRadius: 3,
  },
  roleBadge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Guest-specific styles
  guestCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  guestPoseName: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  guestHint: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestSubhint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  // DEV ONLY — REMOVE BEFORE PRODUCTION
  devPeopleRow: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  devPeopleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(211,47,47,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  devPeopleBtnActive: {
    backgroundColor: 'rgba(46,125,50,0.9)',
  },
  devPeopleBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
