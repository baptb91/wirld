/**
 * RavagerAlert — pulsing red banner shown 30 min before each ravager wave.
 * Disappears automatically when the wave begins (ravagers.length > 0).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useRavagerStore } from '../../store/ravagerStore';
import { WARNING_BEFORE_MS } from '../../engine/RavagerEngine';
import { SoundService } from '../../services/SoundService';

export default function RavagerAlert() {
  const nextAttackAt = useRavagerStore((s) => s.nextAttackAt);
  const waveActive   = useRavagerStore((s) => s.ravagers.length > 0);
  const [timeLeft, setTimeLeft] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const ms = nextAttackAt - Date.now();
      setTimeLeft(ms > 0 ? ms : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextAttackAt]);

  const visible = !waveActive && timeLeft > 0 && timeLeft <= WARNING_BEFORE_MS;

  // Play warning sound once when the alert first becomes visible
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      SoundService.play('ravagerWarning');
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  // Pulsing opacity
  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [visible]);

  if (!visible) return null;

  const totalSec = Math.ceil(timeLeft / 1000);
  const mins     = Math.floor(totalSec / 60);
  const secs     = totalSec % 60;
  const label    = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <Animated.View style={[styles.banner, { opacity: pulseAnim }]}>
      <Text style={styles.text}>⚠️  RAVAGER ATTACK in {label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position:        'absolute',
    top:             52,
    left:            12,
    right:           12,
    backgroundColor: '#CC0000',
    borderRadius:    10,
    paddingVertical: 8,
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.5,
    shadowRadius:    6,
    elevation:       10,
    zIndex:          100,
  },
  text: {
    color:      '#fff',
    fontWeight: '800',
    fontSize:   14,
    letterSpacing: 0.5,
  },
});
