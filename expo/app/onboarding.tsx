import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppBackgroundView } from '@/src/components/AppBackgroundView';
import { GlowView } from '@/src/components/ui/GlowView';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { Colors } from '@/src/theme/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGES = [0, 1, 2, 3] as const;

type PageIndex = 0 | 1 | 2 | 3;

function EnterStage({ active, delay = 0, children }: { active: boolean; delay?: number; children: React.ReactNode }) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = active ? withDelay(delay, withSpring(1, { damping: 15, stiffness: 120 })) : withTiming(0, { duration: 140 });
  }, [active, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [28, 0], Extrapolate.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1], Extrapolate.CLAMP) },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function BoredCrewIllustration({ active }: { active: boolean }) {
  return (
    <EnterStage active={active}>
      <View style={styles.sceneCard}>
        <GlowView color="rgba(255, 159, 10, 0.38)" size={260} style={styles.sceneGlow} />
        <View style={styles.floorOval} />
        <Character x={34} y={78} color="#FFB86B" mood="bored" />
        <Character x={136} y={52} color="#6EE7F9" mood="bored" />
        <Character x={238} y={80} color="#FCA5D6" mood="bored" />
        <View style={styles.deadPhone}>
          <IconSymbol name="iphone" size={18} color="rgba(255,255,255,0.42)" />
        </View>
        <Text style={styles.zzz}>zzz</Text>
      </View>
    </EnterStage>
  );
}

function HappyCrewIllustration({ active }: { active: boolean }) {
  return (
    <EnterStage active={active}>
      <View style={[styles.sceneCard, styles.partyScene]}>
        <GlowView color="rgba(48, 209, 88, 0.42)" size={280} style={styles.sceneGlow} />
        <View style={styles.confettiA} />
        <View style={styles.confettiB} />
        <View style={styles.confettiC} />
        <View style={styles.floorOval} />
        <Character x={30} y={74} color="#FFB86B" mood="happy" />
        <Character x={136} y={46} color="#6EE7F9" mood="happy" crown />
        <Character x={242} y={74} color="#FCA5D6" mood="happy" />
        <View style={styles.sparkBadge}>
          <IconSymbol name="sparkles" size={26} color="#fff" />
        </View>
      </View>
    </EnterStage>
  );
}

function NameIllustration({ active }: { active: boolean }) {
  return (
    <EnterStage active={active}>
      <View style={styles.namePoster}>
        <View style={styles.nameBubbleOne} />
        <View style={styles.nameBubbleTwo} />
        <IconSymbol name="person.crop.circle.badge.plus" size={72} color="#fff" />
        <Text style={styles.namePosterText}>PLAYER PASS</Text>
      </View>
    </EnterStage>
  );
}

function HeroIllustration({ active, name }: { active: boolean; name: string }) {
  const heroName = name.trim() || 'Hero';
  return (
    <EnterStage active={active}>
      <View style={styles.heroPoster}>
        <View style={styles.capeLeft} />
        <View style={styles.capeRight} />
        <View style={styles.heroHead} />
        <View style={styles.heroBody}>
          <View style={styles.chestBadge}>
            <Text style={styles.chestText} numberOfLines={1}>{heroName.slice(0, 9)}</Text>
          </View>
        </View>
        <View style={styles.heroArmLeft} />
        <View style={styles.heroArmRight} />
      </View>
    </EnterStage>
  );
}

function Character({ x, y, color, mood, crown }: { x: number; y: number; color: string; mood: 'bored' | 'happy'; crown?: boolean }) {
  return (
    <View style={[styles.character, { left: x, top: y }]}> 
      {crown ? <Text style={styles.crown}>✦</Text> : null}
      <View style={[styles.head, { backgroundColor: color }]}>
        <View style={styles.eyeLeft} />
        <View style={styles.eyeRight} />
        <View style={[styles.mouth, mood === 'happy' ? styles.mouthHappy : styles.mouthBored]} />
      </View>
      <View style={[styles.body, { backgroundColor: color }]} />
    </View>
  );
}

function IndicatorDot({ index, scrollX }: { index: number; scrollX: Animated.SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [8, 30, 8], Extrapolate.CLAMP),
    opacity: interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [0.3, 1, 0.3], Extrapolate.CLAMP),
  }));
  return <Animated.View style={[styles.indicator, animatedStyle]} />;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setHasCompletedOnboarding, setPlayerName } = useSettingsStore();
  const [currentPage, setCurrentPage] = useState<PageIndex>(0);
  const [name, setName] = useState<string>('');
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollX = useSharedValue(0);

  useEffect(() => {
    if (currentPage === 2) setTimeout(() => inputRef.current?.focus(), 460);
  }, [currentPage]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollX.value = event.contentOffset.x; },
  });

  const goToPage = useCallback((page: PageIndex) => {
    scrollViewRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setCurrentPage(page);
  }, []);

  const goNext = useCallback(() => {
    if (currentPage < 3) goToPage((currentPage + 1) as PageIndex);
  }, [currentPage, goToPage]);

  const complete = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    Keyboard.dismiss();
    setPlayerName(trimmed);
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  }, [name, router, setHasCompletedOnboarding, setPlayerName]);

  const isNameValid = name.trim().length >= 2;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <AppBackgroundView />
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={(event) => setCurrentPage(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH) as PageIndex)}
          >
            <OnboardPage active={currentPage === 0} eyebrow="دورهمی خاموشه؟" title="تو جمع نشستین و حوصله‌تون سر رفته؟" subtitle="PlayVirals همین لحظه سکوت جمع رو می‌شکنه.">
              <BoredCrewIllustration active={currentPage === 0} />
            </OnboardPage>
            <OnboardPage active={currentPage === 1} eyebrow="نگران نباشید" title="PlayVirals اومده جمع‌تونو بترکونه" subtitle="بازی‌های سریع، خنده‌دار و آماده برای هر دورهمی.">
              <HappyCrewIllustration active={currentPage === 1} />
            </OnboardPage>
            <OnboardPage active={currentPage === 2} eyebrow="اول تو" title="اسمتو بگو" subtitle="تا تو بازی‌ها مستقیم با اسم خودت صدات کنیم.">
              <NameIllustration active={currentPage === 2} />
              <View style={styles.inputShell}>
                <TextInput
                  ref={inputRef}
                  value={name}
                  onChangeText={setName}
                  placeholder="مثلا آرش"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.input}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </OnboardPage>
            <OnboardPage active={currentPage === 3} eyebrow="قهرمان جمع" title={`آهای ${name.trim() || 'رفیق'}، آماده‌ای جمعو بترکونی؟`} subtitle="وقتشه اولین بازی رو شروع کنیم.">
              <HeroIllustration active={currentPage === 3} name={name} />
            </OnboardPage>
          </Animated.ScrollView>

          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 36 }]}> 
            <View style={styles.indicators}>{PAGES.map((i) => <IndicatorDot key={i} index={i} scrollX={scrollX} />)}</View>
            {currentPage === 2 && !isNameValid ? (
              <Text style={styles.helper}>حداقل ۲ حرف وارد کن</Text>
            ) : <View style={styles.helperSpace} />}
            <Pressable
              disabled={currentPage === 2 && !isNameValid}
              onPress={currentPage === 3 ? complete : goNext}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, currentPage === 2 && !isNameValid && styles.primaryButtonDisabled]}
            >
              <LinearGradient colors={currentPage === 3 ? ['#FF2D55', '#FF9F0A'] : ['#0A84FF', '#30D158']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <Text style={styles.primaryButtonText}>{currentPage === 3 ? 'بریم بازی' : 'بعدی'}</Text>
              <IconSymbol name={currentPage === 3 ? 'gamecontroller.fill' : 'chevron.right'} size={17} color="#fff" />
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function OnboardPage({ active, eyebrow, title, subtitle, children }: { active: boolean; eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.page}>
      <View style={styles.artWrap}>{children}</View>
      <EnterStage active={active} delay={100}>
        <View style={styles.copyCard}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </EnterStage>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  page: { width: SCREEN_WIDTH, flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 160, paddingTop: 30 },
  artWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 290 },
  sceneCard: { width: 330, height: 260, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.075)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  partyScene: { backgroundColor: 'rgba(28, 48, 38, 0.72)' },
  sceneGlow: { position: 'absolute', left: 35, top: 5 },
  floorOval: { position: 'absolute', left: 40, right: 40, bottom: 34, height: 46, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.09)' },
  character: { position: 'absolute', width: 58, alignItems: 'center' },
  head: { width: 54, height: 54, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { width: 68, height: 72, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, marginTop: -4, opacity: 0.92 },
  eyeLeft: { position: 'absolute', left: 16, top: 20, width: 5, height: 5, borderRadius: 3, backgroundColor: '#20202A' },
  eyeRight: { position: 'absolute', right: 16, top: 20, width: 5, height: 5, borderRadius: 3, backgroundColor: '#20202A' },
  mouth: { position: 'absolute', bottom: 15, width: 18, height: 8, borderWidth: 2, borderColor: '#20202A' },
  mouthHappy: { borderTopWidth: 0, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  mouthBored: { height: 2, borderWidth: 0, backgroundColor: '#20202A', borderRadius: 2 },
  crown: { position: 'absolute', top: -20, zIndex: 2, color: '#FFD60A', fontSize: 22, fontWeight: '900' },
  deadPhone: { position: 'absolute', left: 151, bottom: 56, width: 36, height: 48, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  zzz: { position: 'absolute', right: 42, top: 42, color: 'rgba(255,255,255,0.38)', fontSize: 24, fontWeight: '900' },
  confettiA: { position: 'absolute', left: 48, top: 42, width: 12, height: 28, borderRadius: 6, backgroundColor: '#FF2D55', transform: [{ rotate: '24deg' }] },
  confettiB: { position: 'absolute', right: 58, top: 35, width: 14, height: 14, borderRadius: 4, backgroundColor: '#FFD60A', transform: [{ rotate: '18deg' }] },
  confettiC: { position: 'absolute', left: 154, top: 28, width: 36, height: 8, borderRadius: 6, backgroundColor: '#0A84FF', transform: [{ rotate: '-18deg' }] },
  sparkBadge: { position: 'absolute', right: 30, bottom: 34, width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#30D158' },
  namePoster: { width: 210, height: 210, borderRadius: 56, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: [{ rotate: '-5deg' }] },
  nameBubbleOne: { position: 'absolute', width: 118, height: 118, borderRadius: 59, backgroundColor: 'rgba(255,255,255,0.16)', left: -24, top: -20 },
  nameBubbleTwo: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(48,209,88,0.55)', right: -16, bottom: -12 },
  namePosterText: { marginTop: 14, color: '#fff', fontFamily: 'Viral-Black', fontSize: 15, letterSpacing: 1.2 },
  heroPoster: { width: 270, height: 270, alignItems: 'center', justifyContent: 'center' },
  capeLeft: { position: 'absolute', left: 34, top: 92, width: 102, height: 132, backgroundColor: '#FF2D55', borderTopLeftRadius: 80, borderBottomLeftRadius: 36, transform: [{ rotate: '18deg' }] },
  capeRight: { position: 'absolute', right: 34, top: 92, width: 102, height: 132, backgroundColor: '#FF375F', borderTopRightRadius: 80, borderBottomRightRadius: 36, transform: [{ rotate: '-18deg' }] },
  heroHead: { width: 72, height: 72, borderRadius: 30, backgroundColor: '#FFD3A6', marginBottom: -8, zIndex: 3 },
  heroBody: { width: 142, height: 138, borderRadius: 46, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  chestBadge: { width: 96, height: 58, borderRadius: 18, backgroundColor: '#FFD60A', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', transform: [{ rotate: '-4deg' }] },
  chestText: { fontFamily: 'Viral-Black', fontSize: 15, color: '#111827' },
  heroArmLeft: { position: 'absolute', left: 46, top: 128, width: 42, height: 100, borderRadius: 22, backgroundColor: '#0A84FF', transform: [{ rotate: '34deg' }] },
  heroArmRight: { position: 'absolute', right: 46, top: 128, width: 42, height: 100, borderRadius: 22, backgroundColor: '#0A84FF', transform: [{ rotate: '-34deg' }] },
  copyCard: { alignItems: 'center', paddingHorizontal: 10, marginTop: 12 },
  eyebrow: { color: '#FFD60A', fontSize: 14, fontFamily: 'Viral-Black', marginBottom: 10 },
  title: { color: '#fff', fontFamily: 'Viral-Black', fontSize: 30, lineHeight: 37, textAlign: 'center', marginBottom: 10 },
  subtitle: { color: 'rgba(255,255,255,0.68)', fontSize: 16, lineHeight: 24, textAlign: 'center', fontWeight: '600' },
  inputShell: { marginTop: 20, width: SCREEN_WIDTH - 72, height: 62, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  input: { flex: 1, textAlign: 'center', color: '#fff', fontFamily: 'Viral-Black', fontSize: 23, paddingHorizontal: 20 },
  bottomControls: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 10 },
  indicators: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: 10, alignItems: 'center' },
  indicator: { height: 8, borderRadius: 999, backgroundColor: '#fff' },
  helper: { textAlign: 'center', color: 'rgba(255,255,255,0.54)', fontSize: 12, fontWeight: '700' },
  helperSpace: { height: 15 },
  primaryButton: { height: 58, borderRadius: 24, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#0A84FF', shadowOpacity: 0.42, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  primaryButtonPressed: { transform: [{ scale: 0.98 }] },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontFamily: 'Viral-Black', fontSize: 18 },
});
