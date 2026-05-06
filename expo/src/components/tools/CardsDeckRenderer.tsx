import { Colors } from '@/src/theme/Colors';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, Pressable, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CardCategory, CardCategoryInfo, ALL_CARDS, PartyCard } from '@/src/models/CardModels';

// Platform-safe BlurView (iOS only — broken on Android)
let BlurView: any = null;
if (Platform.OS === 'ios') {
  try { BlurView = require('expo-blur').BlurView; } catch {}
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 250;

interface Props {
  categoryId: CardCategory;
}

export function CardsDeckRenderer({ categoryId }: Props) {
  const category = CardCategoryInfo[categoryId];
  const [includeSpicy, setIncludeSpicy] = useState(false);
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  
  // All subtypes available in this category
  const availableSubtypes = Array.from(new Set(ALL_CARDS.filter(c => c.category === categoryId).map(c => c.subtype)));

  const getFilteredCards = () => {
    let cards = ALL_CARDS.filter(c => c.category === categoryId);
    if (!includeSpicy) cards = cards.filter(c => !c.isSpicy);
    if (selectedSubtype) cards = cards.filter(c => c.subtype === selectedSubtype);
    // Shuffle cards
    return cards.sort(() => Math.random() - 0.5);
  };

  const [deck, setDeck] = useState<PartyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDeck(getFilteredCards());
    setCurrentIndex(0);
  }, [categoryId, includeSpicy, selectedSubtype]);

  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      }
    })
  ).current;

  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete());
  };

  const onSwipeComplete = () => {
    setCurrentIndex(prev => prev + 1);
    position.setValue({ x: 0, y: 0 });
  };

  const handleShuffle = () => {
    setDeck([...deck].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    position.setValue({ x: 0, y: 0 });
  };

  const handleSave = () => {
    if (currentIndex >= deck.length) return;
    const currentCard = deck[currentIndex];
    const newSaved = new Set(savedCards);
    if (newSaved.has(currentCard.id)) {
      newSaved.delete(currentCard.id);
    } else {
      newSaved.add(currentCard.id);
    }
    setSavedCards(newSaved);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-15deg', '0deg', '15deg']
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }]
    };
  };

  const renderFilterContent = () => (
    <View style={styles.filterRow}>
      <View style={styles.subtypesRow}>
        <Pressable 
          style={[styles.chip, !selectedSubtype && styles.chipActive]}
          onPress={() => setSelectedSubtype(null)}
        >
          <Text style={[styles.chipText, !selectedSubtype && styles.chipTextActive]}>All</Text>
        </Pressable>
        {availableSubtypes.map(subtype => (
          <Pressable 
            key={subtype}
            style={[styles.chip, selectedSubtype === subtype && styles.chipActive]}
            onPress={() => setSelectedSubtype(selectedSubtype === subtype ? null : subtype)}
          >
            <Text style={[styles.chipText, selectedSubtype === subtype && styles.chipTextActive]}>{subtype}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable 
        style={[styles.spicyToggle, includeSpicy && styles.spicyToggleActive]}
        onPress={() => setIncludeSpicy(!includeSpicy)}
      >
        <IconSymbol name="flame.fill" size={13} color={includeSpicy ? '#FFF' : 'rgba(255,255,255,0.55)'} />
        <Text style={[styles.spicyText, includeSpicy && styles.spicyTextActive]}>Spicy</Text>
        <View style={[styles.spicyTrack, includeSpicy && styles.spicyTrackActive]}>
          <View style={[styles.spicyKnob, includeSpicy && styles.spicyKnobActive]} />
        </View>
      </Pressable>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {BlurView ? (
        <BlurView intensity={30} tint="dark" style={styles.filtersBlur}>
          {renderFilterContent()}
        </BlurView>
      ) : (
        <View style={[styles.filtersBlur, { backgroundColor: 'rgba(20,20,30,0.85)' }]}>
          {renderFilterContent()}
        </View>
      )}
    </View>
  );

  const renderCards = () => {
    if (currentIndex >= deck.length) {
      return (
        <View style={styles.emptyDeck}>
          <IconSymbol name="sparkle.magnifyingglass" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTextTitle}>No more cards</Text>
          <Text style={styles.emptyText}>Change your filters or select a new category to see more.</Text>
        </View>
      );
    }

    const VISIBLE_BEHIND = 3;
    return deck.map((card, index) => {
      const offset = index - currentIndex;
      if (offset < 0 || offset > VISIBLE_BEHIND) return null;

      if (offset === 0) {
        return (
          <Animated.View
            key={card.id}
            style={[getCardStyle(), styles.cardStyle, { zIndex: 99 }]}
            {...panResponder.panHandlers}
          >
            <CardFace card={card} category={category} />
          </Animated.View>
        );
      }

      // Render the next cards behind, peeking at the top so user knows the deck is swipeable
      const scale = 1 - 0.04 * offset;
      const top = -12 * offset;
      return (
        <Animated.View
          key={card.id}
          style={[
            styles.cardStyle,
            {
              top,
              transform: [{ scale }],
              zIndex: 50 - offset,
              opacity: 1 - 0.12 * offset,
            },
          ]}
        >
          <CardFace card={card} category={category} />
        </Animated.View>
      );
    }).reverse();
  };

  const renderActionBar = () => {
    if (currentIndex >= deck.length) return null;
    
    const currentCard = deck[currentIndex];
    const isSaved = currentCard ? savedCards.has(currentCard.id) : false;

    return (
      <View style={styles.actionBar}>
        <Pressable style={styles.actionButton} onPress={handleSave}>
          <IconSymbol name={isSaved ? "bookmark.fill" : "bookmark"} size={24} color={isSaved ? category.accentColor : "white"} />
        </Pressable>

        <Pressable style={styles.nextButton} onPress={() => forceSwipe('left')}>
          <Text style={styles.nextButtonText}>Next</Text>
          <IconSymbol name="chevron.right" size={20} color="black" />
        </Pressable>

        <Pressable style={styles.actionButton} onPress={handleShuffle}>
          <IconSymbol name="shuffle" size={24} color="white" />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderFilters()}
      <View style={styles.deckContainer}>
        {renderCards()}
      </View>
      {renderActionBar()}
    </View>
  );
}

function CardFace({ card, category }: { card: PartyCard, category: any }) {
  return (
    <View style={styles.cardContainer}>
      <View style={[styles.cardAccent, { backgroundColor: category.accentColor }]} />
      <View style={styles.cardContent}>
        {card.isSpicy && (
          <View style={styles.spicyBadge}>
            <IconSymbol name="flame.fill" size={12} color={Colors.orange} />
            <Text style={styles.spicyText}>SPICY</Text>
          </View>
        )}
        <Text style={styles.cardSubtype}>{card.subtype.toUpperCase()}</Text>
        <Text style={styles.cardText}>{card.text}</Text>
      </View>
      <IconSymbol name={category.icon as any} size={140} color={category.accentColor + '08'} style={styles.watermark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filtersContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filtersBlur: {
    padding: 14,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  subtypesRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'white',
  },
  chipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
  },
  chipTextActive: {
    color: 'black',
  },
  spicyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  spicyToggleActive: {
    backgroundColor: 'rgba(255, 90, 50, 0.18)',
    borderColor: 'rgba(255, 90, 50, 0.55)',
  },
  spicyText: {
    fontFamily: 'Viral-Black',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.4,
  },
  spicyTextActive: {
    color: '#FFF',
  },
  spicyTrack: {
    width: 30,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 2,
    justifyContent: 'center',
  },
  spicyTrackActive: {
    backgroundColor: Colors.orange,
  },
  spicyKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
  },
  spicyKnobActive: {
    transform: [{ translateX: 12 }],
  },
  deckContainer: {
    flex: 1,
    marginTop: 10,
    alignItems: 'center',
  },
  cardStyle: {
    position: 'absolute',
    width: '90%',
    alignSelf: 'center',
    height: SCREEN_WIDTH * 1.15,
  },
  emptyDeck: {
    width: '90%',
    height: SCREEN_WIDTH * 1.15,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  emptyTextTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  cardAccent: {
    height: 8,
    width: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
  },
  spicyBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spicyText: {
    color: Colors.orange,
    fontSize: 11,
    fontWeight: '900',
  },
  cardSubtype: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    color: 'rgba(0,0,0,0.3)',
    marginBottom: 10,
  },
  cardText: {
    fontFamily: 'Viral-Black',
    fontSize: 26,
    color: '#111',
    textAlign: 'center',
    lineHeight: 34,
  },
  watermark: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    zIndex: 1,
    transform: [{ rotate: '-12deg' }],
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 30,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'black',
    letterSpacing: 0.2,
  },
});
