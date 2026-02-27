import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { getPoseByName, ArmPosition } from '../../data/friendshipPoses';

interface PoseOverlayProps {
  poseName: string;
  matchScore: number; // 0-1
  isMatched: boolean;
  width: number;
  height: number;
  /** Whether the left person (viewer's left) is in the correct position */
  leftPersonMatched?: boolean;
  /** Whether the right person (viewer's right) is in the correct position */
  rightPersonMatched?: boolean;
}

// ─── Body proportions (full body with joints) ──────────────────────────────
const B = {
  viewBox: '0 0 260 360',
  headCy: 28,
  headR: 14,
  neckY: 44,
  shoulderY: 56,
  shoulderHalf: 20,
  chestY: 75,
  waistY: 115,
  torsoHalf: 13,
  hipY: 130,
  hipHalf: 15,
  kneeY: 210,
  ankleY: 295,
  footDx: 10,
  footDy: 12,
  legSpread: 11,
  jointR: 4,
  armStroke: 7,
  legStroke: 8,
  leftCx: 75,
  rightCx: 185,
};

// ─── Arm endpoint lookup ─────────────────────────────────────────────────────

const ARM_ENDPOINTS: Record<ArmPosition, {
  elbow: { out: number; down: number };
  hand: { out: number; down: number };
}> = {
  down:      { elbow: { out: 7,  down: 34 },  hand: { out: 5,  down: 68 } },
  up:        { elbow: { out: 5,  down: -20 }, hand: { out: 3,  down: -44 } },
  raise:     { elbow: { out: 18, down: -14 }, hand: { out: 24, down: -38 } },
  reach:     { elbow: { out: 24, down: 8 },   hand: { out: 50, down: 5 } },
  up_reach:  { elbow: { out: 20, down: -11 }, hand: { out: 40, down: -20 } },
  flex:      { elbow: { out: 20, down: 3 },   hand: { out: 14, down: -19 } },
  wave:      { elbow: { out: 14, down: -14 }, hand: { out: 20, down: -35 } },
  hip:       { elbow: { out: 14, down: 18 },  hand: { out: 6,  down: 34 } },
  point:     { elbow: { out: 22, down: 8 },   hand: { out: 52, down: 5 } },
  hug:       { elbow: { out: 26, down: 6 },   hand: { out: 50, down: 14 } },
  crossed:   { elbow: { out: 5,  down: 14 },  hand: { out: -6, down: 26 } },
  peace:     { elbow: { out: 10, down: -18 }, hand: { out: 8,  down: -40 } },
  thumbs_up: { elbow: { out: 13, down: -6 },  hand: { out: 11, down: -30 } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getArmPoints(sx: number, sy: number, position: ArmPosition, side: 'left' | 'right') {
  const ep = ARM_ENDPOINTS[position];
  const dir = side === 'left' ? -1 : 1;
  const elbowX = sx + dir * ep.elbow.out;
  const elbowY = sy + ep.elbow.down;
  const handX = sx + dir * ep.hand.out;
  const handY = sy + ep.hand.down;
  return { elbowX, elbowY, handX, handY };
}

// ─── Person silhouette with joints ──────────────────────────────────────────

function PersonSilhouette({
  cx,
  leftArm,
  rightArm,
  matched,
}: {
  cx: number;
  leftArm: ArmPosition;
  rightArm: ArmPosition;
  matched: boolean;
}) {
  const color = matched ? 'rgba(76,217,100,0.9)' : 'rgba(255,255,255,0.7)';
  const jointColor = matched ? 'rgba(76,217,100,1)' : 'rgba(255,255,255,0.9)';

  // Shoulder points
  const lShoulder = { x: cx - B.shoulderHalf, y: B.shoulderY };
  const rShoulder = { x: cx + B.shoulderHalf, y: B.shoulderY };

  // Hip points
  const lHip = { x: cx - B.hipHalf, y: B.hipY };
  const rHip = { x: cx + B.hipHalf, y: B.hipY };

  // Knee points
  const lKnee = { x: cx - B.legSpread, y: B.kneeY };
  const rKnee = { x: cx + B.legSpread, y: B.kneeY };

  // Ankle points
  const lAnkle = { x: cx - B.legSpread + 2, y: B.ankleY };
  const rAnkle = { x: cx + B.legSpread - 2, y: B.ankleY };

  // Foot endpoints
  const lFoot = { x: lAnkle.x - B.footDx, y: lAnkle.y + B.footDy };
  const rFoot = { x: rAnkle.x + B.footDx, y: rAnkle.y + B.footDy };

  // Arm joints
  const leftArmPts = getArmPoints(lShoulder.x, lShoulder.y, leftArm, 'left');
  const rightArmPts = getArmPoints(rShoulder.x, rShoulder.y, rightArm, 'right');

  // Torso path: shoulders → chest → waist → hips (smooth shape)
  const torsoPath = `
    M ${lShoulder.x},${lShoulder.y}
    Q ${cx},${B.shoulderY - 4} ${rShoulder.x},${rShoulder.y}
    L ${cx + B.torsoHalf + 2},${B.waistY}
    L ${rHip.x},${rHip.y}
    Q ${cx},${B.hipY + 4} ${lHip.x},${lHip.y}
    L ${cx - B.torsoHalf - 2},${B.waistY}
    Z
  `;

  return (
    <G>
      {/* Head */}
      <Circle cx={cx} cy={B.headCy} r={B.headR} fill={color} />

      {/* Neck */}
      <Path
        d={`M ${cx},${B.headCy + B.headR} L ${cx},${B.shoulderY}`}
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* Torso (filled shape) */}
      <Path d={torsoPath} fill={color} />

      {/* Spine line for definition */}
      <Path
        d={`M ${cx},${B.shoulderY} L ${cx},${B.hipY}`}
        stroke={jointColor}
        strokeWidth={1.5}
        opacity={0.3}
      />

      {/* Left arm: shoulder → elbow → hand */}
      <Path
        d={`M ${lShoulder.x},${lShoulder.y} L ${leftArmPts.elbowX},${leftArmPts.elbowY} L ${leftArmPts.handX},${leftArmPts.handY}`}
        stroke={color}
        strokeWidth={B.armStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Right arm: shoulder → elbow → hand */}
      <Path
        d={`M ${rShoulder.x},${rShoulder.y} L ${rightArmPts.elbowX},${rightArmPts.elbowY} L ${rightArmPts.handX},${rightArmPts.handY}`}
        stroke={color}
        strokeWidth={B.armStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Left leg: hip → knee → ankle → foot */}
      <Path
        d={`M ${lHip.x + 3},${lHip.y} L ${lKnee.x},${lKnee.y} L ${lAnkle.x},${lAnkle.y}`}
        stroke={color}
        strokeWidth={B.legStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d={`M ${lAnkle.x},${lAnkle.y} L ${lFoot.x},${lFoot.y}`}
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />

      {/* Right leg: hip → knee → ankle → foot */}
      <Path
        d={`M ${rHip.x - 3},${rHip.y} L ${rKnee.x},${rKnee.y} L ${rAnkle.x},${rAnkle.y}`}
        stroke={color}
        strokeWidth={B.legStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d={`M ${rAnkle.x},${rAnkle.y} L ${rFoot.x},${rFoot.y}`}
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />

      {/* === Joint circles (what makes it look human) === */}
      {/* Shoulders */}
      <Circle cx={lShoulder.x} cy={lShoulder.y} r={B.jointR} fill={jointColor} />
      <Circle cx={rShoulder.x} cy={rShoulder.y} r={B.jointR} fill={jointColor} />

      {/* Elbows */}
      <Circle cx={leftArmPts.elbowX} cy={leftArmPts.elbowY} r={B.jointR - 0.5} fill={jointColor} />
      <Circle cx={rightArmPts.elbowX} cy={rightArmPts.elbowY} r={B.jointR - 0.5} fill={jointColor} />

      {/* Hands (slightly larger) */}
      <Circle cx={leftArmPts.handX} cy={leftArmPts.handY} r={B.jointR + 1} fill={jointColor} />
      <Circle cx={rightArmPts.handX} cy={rightArmPts.handY} r={B.jointR + 1} fill={jointColor} />

      {/* Hips */}
      <Circle cx={lHip.x + 3} cy={lHip.y} r={B.jointR - 0.5} fill={jointColor} />
      <Circle cx={rHip.x - 3} cy={rHip.y} r={B.jointR - 0.5} fill={jointColor} />

      {/* Knees */}
      <Circle cx={lKnee.x} cy={lKnee.y} r={B.jointR} fill={jointColor} />
      <Circle cx={rKnee.x} cy={rKnee.y} r={B.jointR} fill={jointColor} />

      {/* Ankles */}
      <Circle cx={lAnkle.x} cy={lAnkle.y} r={B.jointR - 0.5} fill={jointColor} />
      <Circle cx={rAnkle.x} cy={rAnkle.y} r={B.jointR - 0.5} fill={jointColor} />
    </G>
  );
}

// ─── Main overlay ────────────────────────────────────────────────────────────

export default function PoseOverlay({
  poseName,
  matchScore,
  isMatched,
  width,
  height,
  leftPersonMatched,
  rightPersonMatched,
}: PoseOverlayProps) {
  const pose = getPoseByName(poseName);
  if (!pose) return null;

  const leftMatched = leftPersonMatched ?? isMatched;
  const rightMatched = rightPersonMatched ?? isMatched;

  const leftCx = pose.leftCx ?? B.leftCx;
  const rightCx = pose.rightCx ?? B.rightCx;

  // Compact guide dimensions
  const guideWidth = width * 0.55;
  const guideHeight = 210;

  // Progress bar color
  const glowColor = isMatched
    ? 'rgba(76,217,100,0.6)'
    : matchScore > 0.2
      ? 'rgba(255,204,0,0.4)'
      : 'rgba(255,255,255,0.3)';

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {/* Pose name badge — top */}
      <View style={styles.poseNameContainer}>
        <Text style={styles.poseName}>
          {pose.emoji} {pose.displayName}
        </Text>
      </View>

      {/* Compact silhouette guide — bottom center */}
      <View style={[styles.guideContainer, { width: guideWidth, height: guideHeight }]}>
        <Svg
          width="100%"
          height="100%"
          viewBox={B.viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          <PersonSilhouette
            cx={leftCx}
            leftArm={pose.leftPersonArms[0]}
            rightArm={pose.leftPersonArms[1]}
            matched={leftMatched}
          />
          <PersonSilhouette
            cx={rightCx}
            leftArm={pose.rightPersonArms[0]}
            rightArm={pose.rightPersonArms[1]}
            matched={rightMatched}
          />
        </Svg>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressContainer, { borderColor: glowColor }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(matchScore * 100)}%`, backgroundColor: glowColor },
          ]}
        />
      </View>

      {/* Hold it! badge — center of screen */}
      {isMatched && (
        <View style={styles.matchedBadge}>
          <Text style={styles.matchedText}>Hold it!</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  poseNameContainer: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    left: '20%',
    right: '20%',
    alignItems: 'center',
  },
  poseName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  guideContainer: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 95,
    left: 40,
    right: 40,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  matchedBadge: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(76,217,100,0.85)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    left: '25%',
    right: '25%',
    alignItems: 'center',
  },
  matchedText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
});
