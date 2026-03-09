import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableWithoutFeedback,
    Image, Animated, Dimensions, StatusBar, PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getImageUrl } from '../../services/api';
import { HighlightCard } from './StoryOfMeSection';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SLIDE_DURATION = 5000;
const FADE_DURATION = 150;
const DISMISS_THRESHOLD = 120;

interface StoryViewerModalProps {
    visible: boolean;
    onClose: () => void;
    highlights: HighlightCard[];
    periodStart?: string;
    periodEnd?: string;
    title?: string;
}

function formatDateRange(start?: string, end?: string): string {
    if (!start || !end) return '';
    try {
        const s = new Date(start);
        const e = new Date(end);
        const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const startStr = s.toLocaleDateString('en-US', opts);
        const endStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
        return `${startStr} - ${endStr}`;
    } catch {
        return '';
    }
}

// ── Progress Bar ─────────────────────────────────────────────────────

function ProgressBar({ count, current, progressAnim }: {
    count: number;
    current: number;
    progressAnim: Animated.Value;
}) {
    const gap = 3;
    const barWidth = (SCREEN_W - 24 - gap * (count - 1)) / count;

    return (
        <View style={pStyles.progressRow}>
            {Array.from({ length: count }).map((_, i) => (
                <View key={i} style={[pStyles.progressTrack, { width: barWidth }]}>
                    {i < current ? (
                        <View style={[pStyles.progressFill, { width: '100%' }]} />
                    ) : i === current ? (
                        <Animated.View style={[pStyles.progressFill, {
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        }]} />
                    ) : null}
                </View>
            ))}
        </View>
    );
}

// ── Slide renderers (full-screen) ────────────────────────────────────

function SlideOpener({ card }: { card: Extract<HighlightCard, { type: 'opener' }> }) {
    return (
        <LinearGradient colors={['#D97706', '#F59E0B', '#FBBF24']} style={sStyles.fullSlide}>
            <Text style={sStyles.openerText}>{card.text}</Text>
        </LinearGradient>
    );
}

function SlideTopPost({ card }: { card: Extract<HighlightCard, { type: 'top_post' }> }) {
    const uri = getImageUrl(card.post.imageUrl);
    return (
        <View style={sStyles.fullSlide}>
            {uri ? (
                <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
                <LinearGradient colors={['#1a1a1a', '#111']} style={StyleSheet.absoluteFillObject} />
            )}
            <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={sStyles.topGradient}
            >
                <Text style={sStyles.slideLabel}>{card.label}</Text>
            </LinearGradient>
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={sStyles.bottomGradient}
            >
                {card.post.caption ? (
                    <Text style={sStyles.captionText}>{card.post.caption}</Text>
                ) : null}
                <View style={sStyles.engagementRow}>
                    <View style={sStyles.engItem}>
                        <Ionicons name="heart" size={18} color="#EF4444" />
                        <Text style={sStyles.engValue}>{card.post.likesCount}</Text>
                    </View>
                    <View style={sStyles.engItem}>
                        <Ionicons name="chatbubble" size={16} color="#D97706" />
                        <Text style={sStyles.engValue}>{card.post.commentsCount}</Text>
                    </View>
                    {card.post.repostCount > 0 && (
                        <View style={sStyles.engItem}>
                            <Ionicons name="repeat" size={18} color="#10B981" />
                            <Text style={sStyles.engValue}>{card.post.repostCount}</Text>
                        </View>
                    )}
                </View>
                {card.post.createdAt ? (
                    <Text style={sStyles.postDate}>
                        {new Date(card.post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                ) : null}
            </LinearGradient>
        </View>
    );
}

function SlidePostGallery({ card }: { card: Extract<HighlightCard, { type: 'post_gallery' }> }) {
    const posts = card.posts.slice(0, 6);
    const cols = posts.length <= 2 ? 2 : posts.length <= 4 ? 2 : 3;
    const tileSize = (SCREEN_W - 36 - (cols - 1) * 6) / cols;
    return (
        <View style={[sStyles.fullSlide, { backgroundColor: '#111' }]}>
            <Text style={sStyles.galleryLabel}>{card.label}</Text>
            <View style={sStyles.galleryGrid}>
                {posts.map((post) => {
                    const uri = getImageUrl(post.imageUrl);
                    return (
                        <View key={post.id} style={[sStyles.galleryTile, { width: tileSize, height: tileSize }]}>
                            {uri ? (
                                <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                            ) : (
                                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Ionicons name="image-outline" size={28} color="#555" />
                                </View>
                            )}
                            {post.caption ? (
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={sStyles.galleryCaptionWrap}>
                                    <Text style={sStyles.galleryCaptionText} numberOfLines={2}>{post.caption}</Text>
                                </LinearGradient>
                            ) : null}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

function SlideStatRow({ card }: { card: Extract<HighlightCard, { type: 'stat_row' }> }) {
    return (
        <LinearGradient colors={['#1a1a1a', '#111']} style={[sStyles.fullSlide, { justifyContent: 'center' }]}>
            <View style={sStyles.statRowWrap}>
                {card.items.map((item, i) => (
                    <View key={i} style={sStyles.statItem}>
                        <Ionicons name={item.icon as any} size={28} color="#D97706" />
                        <Text style={sStyles.statBigNum}>{item.value}</Text>
                        <Text style={sStyles.statLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </LinearGradient>
    );
}

function SlideCaptionQuotes({ card }: { card: Extract<HighlightCard, { type: 'caption_quotes' }> }) {
    return (
        <View style={[sStyles.fullSlide, { backgroundColor: '#111', justifyContent: 'center', paddingHorizontal: 24 }]}>
            <Text style={sStyles.quotesLabel}>{card.label}</Text>
            <Text style={sStyles.quoteDecor}>"</Text>
            {card.quotes.map((q, i) => (
                <View key={i} style={sStyles.quoteBlock}>
                    <Text style={sStyles.quoteText}>"{q}"</Text>
                </View>
            ))}
        </View>
    );
}

function SlideCoins({ card }: { card: Extract<HighlightCard, { type: 'coins' }> }) {
    return (
        <LinearGradient colors={['#1a1a1a', '#111']} style={[sStyles.fullSlide, { justifyContent: 'center', alignItems: 'center' }]}>
            <View style={sStyles.coinsRow}>
                {card.earned > 0 && (
                    <View style={sStyles.coinBlock}>
                        <Ionicons name="star" size={44} color="#F59E0B" />
                        <Text style={sStyles.coinBigNum}>{card.earned}</Text>
                        <Text style={sStyles.coinLabel}>earned</Text>
                    </View>
                )}
                {card.given > 0 && (
                    <View style={sStyles.coinBlock}>
                        <Ionicons name="gift" size={44} color="#8B5CF6" />
                        <Text style={sStyles.coinBigNum}>{card.given}</Text>
                        <Text style={sStyles.coinLabel}>given</Text>
                    </View>
                )}
            </View>
        </LinearGradient>
    );
}

function SlideCloser({ card }: { card: Extract<HighlightCard, { type: 'closer' }> }) {
    return (
        <LinearGradient colors={['#D97706', '#F59E0B', '#FBBF24']} style={sStyles.fullSlide}>
            <Text style={sStyles.closerText}>{card.text}</Text>
        </LinearGradient>
    );
}

function RenderSlide({ card }: { card: HighlightCard }) {
    switch (card.type) {
        case 'opener': return <SlideOpener card={card} />;
        case 'top_post': return <SlideTopPost card={card} />;
        case 'post_gallery': return <SlidePostGallery card={card} />;
        case 'stat_row': return <SlideStatRow card={card} />;
        case 'caption_quotes': return <SlideCaptionQuotes card={card} />;
        case 'coins': return <SlideCoins card={card} />;
        case 'closer': return <SlideCloser card={card} />;
        default: return null;
    }
}

// ── Main Modal ───────────────────────────────────────────────────────

export default function StoryViewerModal({
    visible, onClose, highlights, periodStart, periodEnd, title,
}: StoryViewerModalProps) {
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const dragY = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<Animated.CompositeAnimation | null>(null);
    const pausedProgressRef = useRef(0);
    const isDraggingRef = useRef(false);

    const dateLabel = formatDateRange(periodStart, periodEnd);

    // Derived animated values for drag dismiss
    const dragScale = dragY.interpolate({
        inputRange: [0, SCREEN_H * 0.4],
        outputRange: [1, 0.85],
        extrapolate: 'clamp',
    });
    const dragOpacity = dragY.interpolate({
        inputRange: [0, SCREEN_H * 0.4],
        outputRange: [1, 0.4],
        extrapolate: 'clamp',
    });
    const dragBorderRadius = dragY.interpolate({
        inputRange: [0, 60],
        outputRange: [0, 24],
        extrapolate: 'clamp',
    });

    // Reset when modal opens
    useEffect(() => {
        if (visible) {
            setCurrentIndex(0);
            setPaused(false);
            pausedProgressRef.current = 0;
            progressAnim.setValue(0);
            fadeAnim.setValue(1);
            dragY.setValue(0);
            isDraggingRef.current = false;
        }
    }, [visible]);

    // Auto-advance timer
    useEffect(() => {
        if (!visible || highlights.length === 0 || paused) return;

        progressAnim.setValue(pausedProgressRef.current);
        const remaining = SLIDE_DURATION * (1 - pausedProgressRef.current);

        const anim = Animated.timing(progressAnim, {
            toValue: 1,
            duration: remaining,
            useNativeDriver: false,
        });
        timerRef.current = anim;

        anim.start(({ finished }) => {
            if (finished) {
                pausedProgressRef.current = 0;
                goNext();
            }
        });

        return () => {
            anim.stop();
            timerRef.current = null;
        };
    }, [currentIndex, visible, highlights.length, paused]);

    const fadeTransition = useCallback((cb: () => void) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: FADE_DURATION,
            useNativeDriver: true,
        }).start(() => {
            cb();
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: FADE_DURATION,
                useNativeDriver: true,
            }).start();
        });
    }, [fadeAnim]);

    const goNext = useCallback(() => {
        if (currentIndex >= highlights.length - 1) {
            onClose();
            return;
        }
        fadeTransition(() => {
            pausedProgressRef.current = 0;
            progressAnim.setValue(0);
            setCurrentIndex(prev => prev + 1);
        });
    }, [currentIndex, highlights.length, onClose, fadeTransition]);

    const goPrev = useCallback(() => {
        if (currentIndex <= 0) return;
        fadeTransition(() => {
            pausedProgressRef.current = 0;
            progressAnim.setValue(0);
            setCurrentIndex(prev => prev - 1);
        });
    }, [currentIndex, fadeTransition]);

    const dismissModal = useCallback(() => {
        Animated.timing(dragY, {
            toValue: SCREEN_H,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            onClose();
            dragY.setValue(0);
        });
    }, [dragY, onClose]);

    const snapBack = useCallback(() => {
        Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
    }, [dragY]);

    // PanResponder: handles both taps (left/right nav) and vertical drag-to-dismiss
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => {
            // Capture gesture if vertical movement exceeds horizontal
            return Math.abs(gs.dy) > 8 && Math.abs(gs.dy) > Math.abs(gs.dx);
        },
        onPanResponderGrant: () => {
            // Pause auto-advance on touch start
            const listener = progressAnim.addListener(({ value }) => {
                pausedProgressRef.current = value;
                progressAnim.removeListener(listener);
            });
            setPaused(true);
            isDraggingRef.current = false;
        },
        onPanResponderMove: (_, gs) => {
            if (gs.dy > 0) {
                isDraggingRef.current = true;
                dragY.setValue(gs.dy);
            }
        },
        onPanResponderRelease: (evt, gs) => {
            if (isDraggingRef.current && gs.dy > DISMISS_THRESHOLD) {
                // Dragged far enough — dismiss
                dismissModal();
                return;
            }

            if (isDraggingRef.current && gs.dy > 8) {
                // Small drag — snap back, resume
                snapBack();
                setPaused(false);
                return;
            }

            // It was a tap, not a drag — handle left/right navigation
            dragY.setValue(0);
            setPaused(false);

            const x = evt.nativeEvent.locationX;
            if (x < SCREEN_W / 2) {
                goPrev();
            } else {
                goNext();
            }
        },
        onPanResponderTerminate: () => {
            snapBack();
            setPaused(false);
        },
    }), [progressAnim, dragY, dismissModal, snapBack, goPrev, goNext]);

    if (!visible) return null;

    return (
        <Modal visible animationType="fade" transparent statusBarTranslucent>
            <View style={mStyles.backdrop}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

                <Animated.View
                    style={[
                        mStyles.card,
                        {
                            transform: [
                                { translateY: dragY },
                                { scale: dragScale },
                            ],
                            opacity: dragOpacity,
                            borderRadius: dragBorderRadius,
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Full-screen slide */}
                    <View style={mStyles.slideContainer}>
                        {highlights.length === 0 ? (
                            <View style={mStyles.emptyWrap}>
                                <Ionicons name="book-outline" size={48} color="#555" />
                                <Text style={mStyles.emptyText}>No story for this period</Text>
                            </View>
                        ) : (
                            <Animated.View style={[mStyles.slideInner, { opacity: fadeAnim }]}>
                                <RenderSlide card={highlights[currentIndex]} />
                            </Animated.View>
                        )}
                    </View>

                    {/* Overlaid progress bar at top */}
                    {highlights.length > 0 && (
                        <View style={[mStyles.progressOverlay, { top: insets.top + 8 }]}>
                            <ProgressBar count={highlights.length} current={currentIndex} progressAnim={progressAnim} />
                        </View>
                    )}

                    {/* Overlaid date label at bottom */}
                    <View style={[mStyles.bottomOverlay, { bottom: insets.bottom + 12 }]}>
                        <Ionicons name="book" size={14} color="#D97706" />
                        <Text style={mStyles.bottomDateText}>{dateLabel || title || 'Story of Me'}</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ── Progress bar styles ──────────────────────────────────────────────

const pStyles = StyleSheet.create({
    progressRow: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        gap: 3,
    },
    progressTrack: {
        height: 2.5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
});

// ── Slide styles ─────────────────────────────────────────────────────

const sStyles = StyleSheet.create({
    fullSlide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    // opener
    openerText: {
        fontSize: 30,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        paddingHorizontal: 28,
        lineHeight: 40,
    },
    // top_post
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    slideLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#D97706',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 100,
    },
    captionText: {
        fontSize: 17,
        color: '#fff',
        lineHeight: 24,
        marginBottom: 12,
    },
    engagementRow: {
        flexDirection: 'row',
        gap: 20,
    },
    engItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    engValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    postDate: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 8,
    },
    // post_gallery
    galleryLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#D97706',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    galleryTile: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    galleryCaptionWrap: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 8,
        paddingBottom: 8,
        paddingTop: 28,
    },
    galleryCaptionText: {
        fontSize: 11,
        color: '#fff',
        lineHeight: 15,
    },
    // stat_row
    statRowWrap: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 20,
    },
    statItem: {
        alignItems: 'center',
        gap: 6,
    },
    statBigNum: {
        fontSize: 44,
        fontWeight: '800',
        color: '#fff',
    },
    statLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
    },
    // caption_quotes
    quotesLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#D97706',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    quoteDecor: {
        fontSize: 64,
        color: '#D97706',
        fontWeight: '800',
        lineHeight: 64,
        marginBottom: 4,
    },
    quoteBlock: {
        marginBottom: 16,
    },
    quoteText: {
        fontSize: 20,
        fontStyle: 'italic',
        color: '#fff',
        lineHeight: 30,
        textAlign: 'center',
    },
    // coins
    coinsRow: {
        flexDirection: 'row',
        gap: 60,
    },
    coinBlock: {
        alignItems: 'center',
        gap: 8,
    },
    coinBigNum: {
        fontSize: 52,
        fontWeight: '800',
        color: '#fff',
    },
    coinLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
    },
    // closer
    closerText: {
        fontSize: 22,
        fontStyle: 'italic',
        color: '#fff',
        textAlign: 'center',
        paddingHorizontal: 32,
        lineHeight: 32,
    },
});

// ── Modal layout styles ──────────────────────────────────────────────

const mStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: '#000',
    },
    card: {
        flex: 1,
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    slideContainer: {
        flex: 1,
    },
    slideInner: {
        flex: 1,
    },
    emptyWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    emptyText: {
        fontSize: 15,
        color: '#888',
    },
    progressOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
    },
    bottomOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        zIndex: 10,
    },
    bottomDateText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
    },
});
