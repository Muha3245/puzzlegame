// constants/categories.ts
// Word-search categories. Each category has 6 words; "color" is the tile bg.

export type Category = {
  id: string;
  name: string;
  color: string;
  words: string[];
};

export const STRIPE_COLORS = [
  '#F76C6C', // coral
  '#5B9BFF', // sky
  '#4CC38A', // mint
  '#FF9F43', // peach
  '#B36AE2', // lavender
  '#2BC4B4', // teal
  '#F7CB45', // sun
];

export const CATEGORIES: Category[] = [
  { id: 'fruit',   name: 'Fruits',    color: '#F76C6C', words: ['MANGO','GRAPE','PEACH','LEMON','PLUM','APPLE'] },
  { id: 'ocean',   name: 'Ocean',     color: '#5B9BFF', words: ['WHALE','CORAL','SHARK','WAVE','TIDE','REEF'] },
  { id: 'kitchen', name: 'Kitchen',   color: '#FF9F43', words: ['SPOON','KNIFE','PLATE','OVEN','WHISK','BOWL'] },
  { id: 'space',   name: 'Cosmos',    color: '#B36AE2', words: ['COMET','ORBIT','NOVA','MARS','MOON','STAR'] },
  { id: 'forest',  name: 'Forest',    color: '#4CC38A', words: ['MAPLE','BIRCH','FERN','MOSS','PINE','OAK'] },
  { id: 'music',   name: 'Music',     color: '#E94B8C', words: ['CHORD','TEMPO','BASS','NOTE','SONG','BEAT'] },
  { id: 'weather', name: 'Weather',   color: '#2BC4B4', words: ['STORM','CLOUD','HAIL','MIST','RAIN','SNOW'] },
  { id: 'sport',   name: 'Sport',     color: '#F7CB45', words: ['SKATE','CLIMB','SURF','GOLF','SWIM','RUN'] },
  { id: 'animal',  name: 'Animals',   color: '#7B89F2', words: ['TIGER','OTTER','PANDA','WOLF','LION','FOX'] },
  { id: 'travel',  name: 'Travel',    color: '#FF7A8A', words: ['PLANE','TRAIN','BOAT','MAP','BAG','CITY'] },
  { id: 'tools',   name: 'Tools',     color: '#9CB0C8', words: ['DRILL','SCREW','SAW','NAIL','BOLT','TAPE'] },
  { id: 'home',    name: 'Home',      color: '#C68B5E', words: ['CHAIR','TABLE','LAMP','BED','SOFA','DESK'] },
  { id: 'colors',  name: 'Colors',    color: '#E04B6F', words: ['AMBER','OLIVE','CORAL','RUBY','TEAL','JADE'] },
  { id: 'body',    name: 'Body',      color: '#F08E5A', words: ['HEART','BRAIN','WRIST','ELBOW','KNEE','HAND'] },
  { id: 'job',     name: 'Jobs',      color: '#6BD2E0', words: ['BAKER','PILOT','NURSE','CHEF','POET','VET'] },
  { id: 'tech',    name: 'Tech',      color: '#39A8FF', words: ['MOUSE','CABLE','SCREEN','CHIP','CODE','APP'] },
  { id: 'school',  name: 'School',    color: '#E0B85C', words: ['CHALK','PAPER','BOARD','BOOK','TEST','PEN'] },
  { id: 'garden',  name: 'Garden',    color: '#86C95B', words: ['SHRUB','BULB','LEAF','SEED','ROSE','SOIL'] },
  { id: 'birds',   name: 'Birds',     color: '#FF8C5C', words: ['EAGLE','ROBIN','CROW','OWL','DOVE','JAY'] },
  { id: 'gems',    name: 'Gems',      color: '#9D7AF2', words: ['TOPAZ','PEARL','OPAL','ONYX','ROCK','GEM'] },
  { id: 'farm',    name: 'Farm',      color: '#B58A4F', words: ['HORSE','SHEEP','GOAT','HEN','PIG','COW'] },
  { id: 'baking',  name: 'Baking',    color: '#E095BC', words: ['DOUGH','YEAST','FLOUR','SUGAR','EGG','SALT'] },
  { id: 'metals',  name: 'Metals',    color: '#A8B6CC', words: ['STEEL','BRASS','IRON','GOLD','LEAD','TIN'] },
  { id: 'shapes',  name: 'Shapes',    color: '#74B5F2', words: ['CIRCLE','SQUARE','OVAL','CUBE','STAR','ARC'] },
  { id: 'drinks',  name: 'Drinks',    color: '#5DC6A8', words: ['JUICE','COCOA','SODA','TEA','MILK','WINE'] },
  { id: 'gym',     name: 'Fitness',   color: '#FF6B9F', words: ['SQUAT','LUNGE','PLANK','REP','GYM','SET'] },
  { id: 'feels',   name: 'Feelings',  color: '#C788F0', words: ['HAPPY','PROUD','CALM','JOY','LOVE','HOPE'] },
  { id: 'numbers', name: 'Numbers',   color: '#65BB7D', words: ['SEVEN','THREE','FIVE','NINE','TEN','TWO'] },
  { id: 'desert',  name: 'Desert',    color: '#E0A55C', words: ['CAMEL','CACTI','DUNE','SAND','OASIS','SUN'] },
  { id: 'arctic',  name: 'Arctic',    color: '#7DBCE0', words: ['POLAR','SEAL','BERG','FROST','ICE','SNOW'] },
  { id: 'jungle',  name: 'Jungle',    color: '#52B377', words: ['VINES','MONKEY','SLOTH','LEAF','BUG','APE'] },
  { id: 'magic',   name: 'Magic',     color: '#9457E0', words: ['WIZARD','SPELL','POTION','WAND','RUNE','ORB'] },
];
