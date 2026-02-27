/**
 * 12 predefined friendship poses for the meetup photo booth.
 * Each pose defines arm positions for two people side by side.
 * The PoseOverlay component renders human silhouettes programmatically.
 */

export type ArmPosition =
  | 'down'       // arms hanging at sides
  | 'up'         // arm straight up above head
  | 'raise'      // arm raised diagonally (victory V)
  | 'reach'      // arm extended forward (toward partner)
  | 'up_reach'   // arm reaching up and toward partner (high five / heart)
  | 'flex'       // arm bent at elbow, fist up (flexing)
  | 'wave'       // arm waving up and out
  | 'hip'        // hand on hip
  | 'point'      // arm pointing straight at partner
  | 'hug'        // arm reaching behind partner
  | 'crossed'    // arm crossed over chest
  | 'peace'      // arm up (peace sign gesture)
  | 'thumbs_up'; // arm bent with fist up (thumbs up)

export interface FriendshipPose {
  id: string;
  name: string;
  displayName: string;
  description: string;
  emoji: string;
  /**
   * Arm positions: [leftArm, rightArm] for the left person.
   * "left" means the arm on the viewer's left (away from partner).
   * "right" means the arm on the viewer's right (toward partner).
   */
  leftPersonArms: [ArmPosition, ArmPosition];
  /**
   * Arm positions: [leftArm, rightArm] for the right person.
   * "left" means the arm on the viewer's left (toward partner).
   * "right" means the arm on the viewer's right (away from partner).
   */
  rightPersonArms: [ArmPosition, ArmPosition];
  /** Optional custom X positions for people who stand closer/further */
  leftCx?: number;
  rightCx?: number;
}

export const FRIENDSHIP_POSES: FriendshipPose[] = [
  {
    id: 'high_five',
    name: 'high_five',
    displayName: 'High Five',
    description: 'Raise your hands and give each other a high five!',
    emoji: '\u{1F64C}',
    leftPersonArms: ['down', 'up_reach'],
    rightPersonArms: ['up_reach', 'down'],
  },
  {
    id: 'back_to_back',
    name: 'back_to_back',
    displayName: 'Back to Back',
    description: 'Stand back to back like cool friends!',
    emoji: '\u{1F519}',
    leftPersonArms: ['crossed', 'crossed'],
    rightPersonArms: ['crossed', 'crossed'],
    leftCx: 135,
    rightCx: 225,
  },
  {
    id: 'heart_hands',
    name: 'heart_hands',
    displayName: 'Heart Hands',
    description: 'Make a heart shape together with your hands!',
    emoji: '\u{1F495}',
    leftPersonArms: ['down', 'up_reach'],
    rightPersonArms: ['up_reach', 'down'],
  },
  {
    id: 'peace_signs',
    name: 'peace_signs',
    displayName: 'Peace Signs',
    description: 'Show your peace signs! \u270C\uFE0F',
    emoji: '\u270C\uFE0F',
    leftPersonArms: ['peace', 'peace'],
    rightPersonArms: ['peace', 'peace'],
  },
  {
    id: 'silly_faces',
    name: 'silly_faces',
    displayName: 'Silly Faces',
    description: 'Make your silliest face! No rules!',
    emoji: '\u{1F92A}',
    leftPersonArms: ['wave', 'hip'],
    rightPersonArms: ['hip', 'wave'],
  },
  {
    id: 'side_hug',
    name: 'side_hug',
    displayName: 'Side Hug',
    description: 'Give your friend a side hug!',
    emoji: '\u{1F917}',
    leftPersonArms: ['down', 'hug'],
    rightPersonArms: ['hug', 'down'],
    leftCx: 125,
    rightCx: 235,
  },
  {
    id: 'flexing',
    name: 'flexing',
    displayName: 'Flexing',
    description: 'Show off those muscles! \u{1F4AA}',
    emoji: '\u{1F4AA}',
    leftPersonArms: ['flex', 'flex'],
    rightPersonArms: ['flex', 'flex'],
  },
  {
    id: 'pointing_at_each_other',
    name: 'pointing_at_each_other',
    displayName: 'Point at Each Other',
    description: 'Point at your friend!',
    emoji: '\u{1F449}',
    leftPersonArms: ['hip', 'point'],
    rightPersonArms: ['point', 'hip'],
  },
  {
    id: 'thumbs_up',
    name: 'thumbs_up',
    displayName: 'Thumbs Up',
    description: 'Double thumbs up! \u{1F44D}',
    emoji: '\u{1F44D}',
    leftPersonArms: ['thumbs_up', 'thumbs_up'],
    rightPersonArms: ['thumbs_up', 'thumbs_up'],
  },
  {
    id: 'victory',
    name: 'victory',
    displayName: 'Victory!',
    description: 'Raise both arms in victory!',
    emoji: '\u{1F3C6}',
    leftPersonArms: ['raise', 'raise'],
    rightPersonArms: ['raise', 'raise'],
  },
  {
    id: 'handshake',
    name: 'handshake',
    displayName: 'Handshake',
    description: 'Shake hands like true friends!',
    emoji: '\u{1F91D}',
    leftPersonArms: ['down', 'reach'],
    rightPersonArms: ['reach', 'down'],
  },
  {
    id: 'shoulder_to_shoulder',
    name: 'shoulder_to_shoulder',
    displayName: 'Shoulder to Shoulder',
    description: 'Stand shoulder to shoulder!',
    emoji: '\u{1F9CD}',
    leftPersonArms: ['down', 'down'],
    rightPersonArms: ['down', 'down'],
    leftCx: 130,
    rightCx: 230,
  },
];

export function getRandomPoses(count: number = 4): FriendshipPose[] {
  const shuffled = [...FRIENDSHIP_POSES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getPoseByName(name: string): FriendshipPose | undefined {
  return FRIENDSHIP_POSES.find(p => p.name === name);
}
