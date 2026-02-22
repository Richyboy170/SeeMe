import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import { CoinsStackParamList } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 64) / 7);

type FriendshipDetailRouteProp = RouteProp<CoinsStackParamList, 'FriendshipDetail'>;

interface Props {
  route: FriendshipDetailRouteProp;
}

interface DailyLog {
  date: string;
  youGave: number;
  theyGave: number;
  isBidirectional: boolean;
}

interface FriendshipData {
  trust: {
    trustScore: number;
    currentStreak: number;
    longestStreak: number;
    totalExchangeDays: number;
    bidirectionalDays: number;
    totalCoinsYouGave: number;
    totalCoinsTheyGave: number;
    exchangeCountYouGave: number;
    exchangeCountTheyGave: number;
    isMutualFollow: boolean;
    isActive: boolean;
    friendsSince: string | null;
    lastExchangeDate: string | null;
  };
  dailyLogs: DailyLog[];
  insights: {
    consistency: { score: number; max: number; streakPart: number; engagementPart: number };
    bidirectionality: { score: number; max: number; ratioPart: number; balancePart: number };
    generosity: { score: number; max: number };
  };
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getRankInfo = (trustScore: number) => {
  if (trustScore >= 80) return { label: 'Best Friend', color: '#8B5CF6', gradient: ['#8B5CF6', '#A855F7'] as [string, string] };
  if (trustScore >= 60) return { label: 'Close Friend', color: '#EC4899', gradient: ['#EC4899', '#F472B6'] as [string, string] };
  if (trustScore >= 40) return { label: 'Good Friend', color: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] as [string, string] };
  if (trustScore >= 20) return { label: 'Building', color: '#10B981', gradient: ['#10B981', '#34D399'] as [string, string] };
  return { label: 'New', color: '#6B7280', gradient: ['#9CA3AF', '#D1D5DB'] as [string, string] };
};

export default function FriendshipDetailScreen({ route }: Props) {
  const { colors, isDark } = useTheme();
  const { otherUserId, otherUsername, otherAvatarUrl } = route.params;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FriendshipData | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDay, setSelectedDay] = useState<DailyLog | null>(null);

  const loadData = useCallback(async (month?: string) => {
    try {
      const response = await api.getFriendshipDetail(otherUserId, month);
      setData(response);
    } catch (error) {
      console.error('Error loading friendship detail:', error);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    loadData(calendarMonth);
  }, [calendarMonth, loadData]);

  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + direction, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(newMonth);
    setSelectedDay(null);
  };

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text.secondary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.secondary }}>No friendship data</Text>
      </View>
    );
  }

  const { trust, dailyLogs, insights } = data;
  const rankInfo = getRankInfo(trust.trustScore);
  const avatarUrl = getImageUrl(otherAvatarUrl);

  // Build calendar grid
  const [calYear, calMonth] = calendarMonth.split('-').map(Number);
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();

  // Create a lookup map for daily logs by date
  const logMap: { [date: string]: DailyLog } = {};
  dailyLogs.forEach(log => { logMap[log.date] = log; });

  const calendarCells: Array<{ day: number; log: DailyLog | null } | null> = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, log: logMap[dateStr] || null });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ============ FRIEND HEADER ============ */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        <View style={[styles.avatarRing, { borderColor: rankInfo.color }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="person" size={28} color={colors.text.tertiary} />
            </View>
          )}
        </View>

        <Text style={[styles.headerUsername, { color: colors.text.primary }]}>@{otherUsername}</Text>

        <LinearGradient colors={rankInfo.gradient} style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{trust.trustScore}</Text>
        </LinearGradient>

        <View style={[styles.rankBadge, { backgroundColor: isDark ? '#1F2937' : rankInfo.color + '20' }]}>
          <Text style={[styles.rankText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
        </View>

        {trust.currentStreak > 0 && (
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={14} color="#F97316" />
            <Text style={styles.streakText}>{trust.currentStreak} day streak</Text>
          </View>
        )}
      </View>

      {/* ============ CALENDAR ============ */}
      <View style={[styles.calendarCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.calendarTitle, { color: colors.text.primary }]}>{formatMonthLabel(calendarMonth)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map(label => (
            <View key={label} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, { color: colors.text.tertiary }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.dayGrid}>
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }

            const hasYouGave = cell.log && cell.log.youGave > 0;
            const hasTheyGave = cell.log && cell.log.theyGave > 0;
            const isSelected = selectedDay?.date === cell.log?.date && cell.log;

            return (
              <TouchableOpacity
                key={cell.day}
                style={[
                  styles.dayCell,
                  isSelected && [styles.dayCellSelected, { borderColor: rankInfo.color }],
                ]}
                onPress={() => cell.log ? setSelectedDay(cell.log) : setSelectedDay(null)}
                activeOpacity={cell.log ? 0.7 : 1}
              >
                <Text style={[
                  styles.dayNumber,
                  { color: cell.log ? colors.text.primary : colors.text.tertiary },
                ]}>
                  {cell.day}
                </Text>
                {(hasYouGave || hasTheyGave) && (
                  <View style={styles.dotRow}>
                    {hasYouGave && <View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} />}
                    {hasTheyGave && <View style={[styles.dot, { backgroundColor: '#EC4899' }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>You gave</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EC4899' }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>They gave</Text>
          </View>
        </View>

        {/* Selected day detail */}
        {selectedDay && (
          <View style={[styles.dayDetail, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: colors.border }]}>
            <Text style={[styles.dayDetailDate, { color: colors.text.primary }]}>
              {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.dayDetailRow}>
              <View style={styles.dayDetailItem}>
                <View style={[styles.dayDetailDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={[styles.dayDetailLabel, { color: colors.text.secondary }]}>You gave:</Text>
                <Text style={[styles.dayDetailValue, { color: colors.text.primary }]}>{selectedDay.youGave}</Text>
              </View>
              <View style={styles.dayDetailItem}>
                <View style={[styles.dayDetailDot, { backgroundColor: '#EC4899' }]} />
                <Text style={[styles.dayDetailLabel, { color: colors.text.secondary }]}>They gave:</Text>
                <Text style={[styles.dayDetailValue, { color: colors.text.primary }]}>{selectedDay.theyGave}</Text>
              </View>
            </View>
            {selectedDay.isBidirectional && (
              <View style={styles.bidirectionalTag}>
                <Ionicons name="swap-horizontal" size={12} color="#10B981" />
                <Text style={styles.bidirectionalText}>Mutual exchange day!</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ============ SCORE BREAKDOWN ============ */}
      <View style={[styles.breakdownCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Score Breakdown</Text>

        <ProgressRow
          label="Consistency"
          value={insights.consistency.score}
          max={insights.consistency.max}
          color="#8B5CF6"
          description={`Streak (${insights.consistency.streakPart}/30) + Engagement (${insights.consistency.engagementPart}/30)`}
          colors={colors}
        />
        <ProgressRow
          label="Bidirectionality"
          value={insights.bidirectionality.score}
          max={insights.bidirectionality.max}
          color="#EC4899"
          description={`Mutual ratio (${insights.bidirectionality.ratioPart}/20) + Balance (${insights.bidirectionality.balancePart}/10)`}
          colors={colors}
        />
        <ProgressRow
          label="Generosity"
          value={insights.generosity.score}
          max={insights.generosity.max}
          color="#F59E0B"
          description="Total coins exchanged"
          colors={colors}
        />
      </View>

      {/* ============ RELATIONSHIP STATS ============ */}
      <View style={[styles.statsCard, { backgroundColor: isDark ? colors.surface : colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Relationship Stats</Text>

        <View style={styles.statsGrid}>
          <StatCell icon="flame" iconColor="#F97316" label="Current Streak" value={`${trust.currentStreak}d`} colors={colors} isDark={isDark} />
          <StatCell icon="trophy" iconColor="#F59E0B" label="Best Streak" value={`${trust.longestStreak}d`} colors={colors} isDark={isDark} />
          <StatCell icon="calendar" iconColor="#3B82F6" label="Exchange Days" value={`${trust.totalExchangeDays}`} colors={colors} isDark={isDark} />
          <StatCell icon="swap-horizontal" iconColor="#10B981" label="Mutual Days" value={`${trust.bidirectionalDays}`} colors={colors} isDark={isDark} />
          <StatCell icon="arrow-up-circle" iconColor="#8B5CF6" label="You Gave" value={`${trust.totalCoinsYouGave}`} colors={colors} isDark={isDark} />
          <StatCell icon="arrow-down-circle" iconColor="#EC4899" label="They Gave" value={`${trust.totalCoinsTheyGave}`} colors={colors} isDark={isDark} />
          <StatCell
            icon="time"
            iconColor="#6366F1"
            label="Friends Since"
            value={trust.friendsSince ? new Date(trust.friendsSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '--'}
            colors={colors}
            isDark={isDark}
          />
          <StatCell
            icon="people"
            iconColor="#8B5CF6"
            label="Mutual Follow"
            value={trust.isMutualFollow ? 'Yes' : 'No'}
            colors={colors}
            isDark={isDark}
          />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ProgressRow({ label, value, max, color, description, colors }: {
  label: string;
  value: number;
  max: number;
  color: string;
  description: string;
  colors: any;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: colors.text.primary }]}>{label}</Text>
        <Text style={[styles.progressValue, { color }]}>{value}/{max}</Text>
      </View>
      <View style={[styles.progressBg, { backgroundColor: colors.surfaceVariant }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.progressDesc, { color: colors.text.tertiary }]}>{description}</Text>
    </View>
  );
}

function StatCell({ icon, iconColor, label, value, colors, isDark }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={[styles.statCell, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.statCellValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.statCellLabel, { color: colors.text.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  headerUsername: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreValue: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  rankBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  rankText: { fontSize: 13, fontWeight: '600' },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  streakText: { fontSize: 13, fontWeight: '600', color: '#F97316' },

  // Calendar
  calendarCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarTitle: { fontSize: 16, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayCell: { width: DAY_SIZE, alignItems: 'center', paddingVertical: 4 },
  weekdayText: { fontSize: 11, fontWeight: '600' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayCellSelected: { borderWidth: 1.5 },
  dayNumber: { fontSize: 13, fontWeight: '600' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '500' },

  // Day detail tooltip
  dayDetail: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayDetailDate: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  dayDetailRow: { flexDirection: 'row', gap: 16 },
  dayDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dayDetailDot: { width: 8, height: 8, borderRadius: 4 },
  dayDetailLabel: { fontSize: 13 },
  dayDetailValue: { fontSize: 14, fontWeight: '700' },
  bidirectionalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  bidirectionalText: { fontSize: 12, fontWeight: '600', color: '#059669' },

  // Score Breakdown
  breakdownCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  progressRow: { marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 14, fontWeight: '600' },
  progressValue: { fontSize: 14, fontWeight: '700' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressDesc: { fontSize: 11, marginTop: 4 },

  // Relationship Stats
  statsCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: {
    width: (SCREEN_WIDTH - 56) / 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statCellValue: { fontSize: 18, fontWeight: '700' },
  statCellLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});
