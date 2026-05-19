// components/CatIcon.tsx
// Flat-style category icons rendered as react-native-svg.

import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';

type Props = { id: string; size?: number };

export function CatIcon({ id, size = 44 }: Props) {
  const props = { width: size, height: size, viewBox: '0 0 40 40' };
  switch (id) {
    case 'fruit':
      return (
        <Svg {...props}>
          <Path d="M20 11 C 16 7 10 9 9 14 C 8 22 15 32 20 32 C 25 32 32 22 31 14 C 30 9 24 7 20 11 Z" fill="#fff"/>
          <Path d="M20 12 C 21 9 23 7 26 7" stroke="#3FB36A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <Ellipse cx="14" cy="17" rx="3" ry="2" fill="rgba(255,255,255,0.55)"/>
        </Svg>
      );
    case 'ocean':
      return (
        <Svg {...props}>
          <Path d="M4 22 Q 10 14 16 22 T 28 22 T 40 22 L 40 32 L 4 32 Z" fill="#fff"/>
          <Path d="M4 26 Q 10 18 16 26 T 28 26 T 40 26" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none"/>
          <Circle cx="30" cy="11" r="3" fill="#FFD23F"/>
        </Svg>
      );
    case 'kitchen':
      return (
        <Svg {...props}>
          <Rect x="13" y="20" width="3" height="14" rx="1.5" fill="#fff"/>
          <Rect x="11" y="6" width="2" height="10" rx="1" fill="#fff"/>
          <Rect x="14.5" y="6" width="2" height="10" rx="1" fill="#fff"/>
          <Rect x="18" y="6" width="2" height="10" rx="1" fill="#fff"/>
          <Rect x="24" y="18" width="3" height="16" rx="1.5" fill="#fff"/>
          <Ellipse cx="25.5" cy="11" rx="4" ry="6" fill="#fff"/>
        </Svg>
      );
    case 'space':
      return (
        <Svg {...props}>
          <Circle cx="20" cy="20" r="9" fill="#fff"/>
          <Ellipse cx="20" cy="20" rx="15" ry="4" fill="none" stroke="#fff" strokeWidth="2.5" transform="rotate(-20 20 20)"/>
          <Circle cx="16" cy="17" r="2" fill="rgba(0,0,0,0.12)"/>
        </Svg>
      );
    case 'forest':
      return (
        <Svg {...props}>
          <Rect x="18" y="24" width="4" height="10" fill="#5A3A1B"/>
          <Circle cx="20" cy="14" r="9" fill="#fff"/>
          <Circle cx="13" cy="19" r="6" fill="#fff"/>
          <Circle cx="27" cy="19" r="6" fill="#fff"/>
        </Svg>
      );
    case 'music':
      return (
        <Svg {...props}>
          <Rect x="22" y="8" width="3" height="20" fill="#fff"/>
          <Path d="M22 8 Q 30 8 31 14 L 31 11 Q 30 6 22 6 Z" fill="#fff"/>
          <Ellipse cx="20" cy="28" rx="5" ry="4" fill="#fff"/>
        </Svg>
      );
    case 'weather':
      return (
        <Svg {...props}>
          <Circle cx="13" cy="13" r="5" fill="#FFD23F"/>
          <Ellipse cx="22" cy="24" rx="11" ry="6" fill="#fff"/>
          <Circle cx="14" cy="22" r="5" fill="#fff"/>
          <Circle cx="28" cy="20" r="5" fill="#fff"/>
        </Svg>
      );
    case 'sport':
      return (
        <Svg {...props}>
          <Circle cx="20" cy="20" r="11" fill="#fff"/>
          <Path d="M20 9 L 14 14 L 16 22 L 24 22 L 26 14 Z" fill="#1F1B16"/>
          <Path d="M20 9 L 20 4 M 9 17 L 5 16 M 31 17 L 35 16 M 16 22 L 13 30 M 24 22 L 27 30" stroke="#1F1B16" strokeWidth="1.6"/>
        </Svg>
      );
    case 'animal':
      return (
        <Svg {...props}>
          <Ellipse cx="20" cy="26" rx="8" ry="7" fill="#fff"/>
          <Circle cx="11" cy="17" r="3.5" fill="#fff"/>
          <Circle cx="29" cy="17" r="3.5" fill="#fff"/>
          <Circle cx="16" cy="10" r="3" fill="#fff"/>
          <Circle cx="24" cy="10" r="3" fill="#fff"/>
        </Svg>
      );
    case 'travel':
      return (
        <Svg {...props}>
          <Path d="M6 22 L 34 16 L 34 20 L 14 26 L 12 32 L 9 31 L 10 26 L 5 24 Z" fill="#fff"/>
        </Svg>
      );
    case 'tools':
      return (
        <Svg {...props}>
          <Path d="M28 8 a 7 7 0 1 0 4 12 L 14 32 L 8 32 L 8 26 L 22 12 a 7 7 0 0 0 6 -4 Z" fill="#fff"/>
        </Svg>
      );
    case 'home':
      return (
        <Svg {...props}>
          <Path d="M6 20 L 20 8 L 34 20 L 30 20 L 30 32 L 10 32 L 10 20 Z" fill="#fff"/>
          <Rect x="17" y="22" width="6" height="10" fill="rgba(31,27,22,0.18)"/>
        </Svg>
      );
    case 'colors':
      return (
        <Svg {...props}>
          <Circle cx="14" cy="14" r="6" fill="#FFD23F"/>
          <Circle cx="26" cy="14" r="6" fill="#5B9BFF" opacity={0.85}/>
          <Circle cx="20" cy="26" r="6" fill="#fff" opacity={0.95}/>
        </Svg>
      );
    case 'body':
      return (
        <Svg {...props}>
          <Path d="M20 32 C 6 22 6 12 13 10 C 17 9 20 12 20 15 C 20 12 23 9 27 10 C 34 12 34 22 20 32 Z" fill="#fff"/>
        </Svg>
      );
    case 'tech':
      return (
        <Svg {...props}>
          <Rect x="6" y="8" width="28" height="18" rx="2" fill="#fff"/>
          <Rect x="9" y="11" width="22" height="12" rx="1" fill="rgba(31,27,22,0.25)"/>
          <Rect x="16" y="28" width="8" height="3" fill="#fff"/>
        </Svg>
      );
    case 'school':
      return (
        <Svg {...props}>
          <Path d="M8 9 L 20 12 L 20 32 L 8 29 Z" fill="#fff"/>
          <Path d="M32 9 L 20 12 L 20 32 L 32 29 Z" fill="#fff" opacity={0.8}/>
        </Svg>
      );
    case 'birds':
      return (
        <Svg {...props}>
          <Path d="M8 24 Q 14 12 22 16 L 30 12 L 28 18 L 32 20 L 22 24 Q 18 30 8 24 Z" fill="#fff"/>
          <Circle cx="24" cy="18" r="1.3" fill="#1F1B16"/>
        </Svg>
      );
    case 'gems':
      return (
        <Svg {...props}>
          <Path d="M20 6 L 30 14 L 24 32 L 16 32 L 10 14 Z" fill="#fff"/>
        </Svg>
      );
    case 'farm':
      return (
        <Svg {...props}>
          <Ellipse cx="20" cy="24" rx="11" ry="7" fill="#fff"/>
          <Circle cx="14" cy="18" r="3" fill="#fff"/>
          <Circle cx="26" cy="18" r="3" fill="#fff"/>
          <Circle cx="17" cy="23" r="1.2" fill="#1F1B16"/>
          <Circle cx="23" cy="23" r="1.2" fill="#1F1B16"/>
        </Svg>
      );
    case 'shapes':
      return (
        <Svg {...props}>
          <Circle cx="13" cy="13" r="5" fill="#fff"/>
          <Rect x="22" y="8" width="10" height="10" fill="#fff"/>
          <Path d="M20 22 L 30 32 L 10 32 Z" fill="#fff"/>
        </Svg>
      );
    case 'drinks':
      return (
        <Svg {...props}>
          <Path d="M12 10 L 28 10 L 26 32 L 14 32 Z" fill="#fff"/>
          <Rect x="14" y="13" width="12" height="4" fill="rgba(31,27,22,0.25)"/>
        </Svg>
      );
    case 'magic':
      return (
        <Svg {...props}>
          <Rect x="22" y="6" width="3" height="22" rx="1.5" transform="rotate(35 23.5 17)" fill="#fff"/>
          <Path d="M11 11 L 13 17 L 18 14 L 13 19 L 16 24 L 11 21 L 6 24 L 9 19 L 4 14 L 9 17 Z" fill="#FFD23F"/>
          <Circle cx="29" cy="29" r="2" fill="#fff"/>
        </Svg>
      );
    case 'feels':
      return (
        <Svg {...props}>
          <Circle cx="20" cy="20" r="11" fill="#fff"/>
          <Circle cx="16" cy="17" r="1.5" fill="#1F1B16"/>
          <Circle cx="24" cy="17" r="1.5" fill="#1F1B16"/>
          <Path d="M14 23 Q 20 28 26 23" stroke="#1F1B16" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </Svg>
      );
    default:
      return (
        <Svg {...props}>
          <SvgText x="20" y="27" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff">
            {(id || '?').charAt(0).toUpperCase()}
          </SvgText>
        </Svg>
      );
  }
}
