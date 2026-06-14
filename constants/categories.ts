// constants/categories.ts
// Each category has 30 words sorted roughly shortest-first so early levels
// (small grids) always receive short words and longer words appear later.

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
  {
    id: 'fruit', name: 'Fruits', color: '#F76C6C',
    words: ['FIG','PLUM','PEAR','KIWI','LIME','DATE','MANGO','GRAPE','PEACH','LEMON','APPLE','BERRY','MELON','GUAVA','PRUNE','CHERRY','ORANGE','BANANA','LYCHEE','PAPAYA','LOQUAT','DURIAN','POMELO','QUINCE','APRICOT','COCONUT','KUMQUAT','AVOCADO','TANGELO','NECTARINE'],
  },
  {
    id: 'ocean', name: 'Ocean', color: '#5B9BFF',
    words: ['EEL','WAVE','TIDE','REEF','CRAB','KELP','FISH','WHALE','CORAL','SHARK','SQUID','SHELL','PRAWN','MANTA','COAST','ANCHOR','SPONGE','SHRIMP','URCHIN','LAGOON','SAILOR','TURTLE','TRENCH','CURRENT','LOBSTER','OCTOPUS','DOLPHIN','STARFISH','SEAHORSE','BARNACLE'],
  },
  {
    id: 'kitchen', name: 'Kitchen', color: '#FF9F43',
    words: ['CUP','MUG','POT','PAN','TONG','RACK','BOWL','OVEN','FORK','SPOON','KNIFE','WHISK','LADLE','PLATE','SCALE','SIEVE','SCOOP','TIMER','MIXER','GRATER','PEELER','FUNNEL','MORTAR','PESTLE','TRIVET','BLENDER','SPATULA','SKILLET','RAMEKIN','COLANDER'],
  },
  {
    id: 'space', name: 'Cosmos', color: '#B36AE2',
    words: ['SUN','MARS','NOVA','MOON','STAR','ORBIT','COMET','VENUS','PLUTO','SOLAR','PROBE','TITAN','EARTH','AURORA','COSMOS','ZENITH','PLASMA','SATURN','METEOR','CRATER','NEBULA','PULSAR','QUASAR','ROCKET','GALAXY','SHUTTLE','ECLIPSE','GRAVITY','NEUTRON','ASTEROID'],
  },
  {
    id: 'forest', name: 'Forest', color: '#4CC38A',
    words: ['ASH','OAK','ELM','FIG','FERN','MOSS','PINE','LEAF','TWIG','BARK','ROOT','GROVE','SHRUB','ACORN','BEECH','HAZEL','STUMP','TRUNK','HOLLY','ASPEN','MAPLE','BIRCH','CEDAR','GLADE','CANOPY','FUNGUS','WILLOW','BRANCH','TIMBER','SYCAMORE'],
  },
  {
    id: 'music', name: 'Music', color: '#E94B8C',
    words: ['HIT','JAM','KEY','POP','BEAT','BASS','CLEF','DRUM','FLAT','HARP','NOTE','OBOE','SONG','TUNE','JAZZ','PITCH','SHARP','CHORD','FLUTE','LYRIC','SCALE','TEMPO','VERSE','VOCAL','CELLO','PIANO','RHYTHM','BRIDGE','CHORUS','MELODY'],
  },
  {
    id: 'weather', name: 'Weather', color: '#2BC4B4',
    words: ['DEW','FOG','ICE','DRY','DAMP','GUST','HAIL','HAZE','MIST','RAIN','SNOW','WIND','FROST','SLEET','SUNNY','THAW','FLASH','CLOUD','STORM','BREEZE','ARCTIC','FREEZE','SQUALL','HUMID','RAINBOW','DROUGHT','CYCLONE','TORNADO','THUNDER','BLIZZARD'],
  },
  {
    id: 'sport', name: 'Sport', color: '#F7CB45',
    words: ['BOX','RUN','DIVE','GOLF','JUMP','POLO','SURF','SWIM','LAPS','RACE','RUGBY','RELAY','SKATE','CLIMB','PITCH','CATCH','SERVE','THROW','JUDO','CYCLE','VAULT','TENNIS','SOCCER','HURDLE','ROWING','SPRINT','TACKLE','FENCING','ARCHERY','DRIBBLE'],
  },
  {
    id: 'animal', name: 'Animals', color: '#7B89F2',
    words: ['APE','FOX','GNU','YAK','BEAR','DEER','GOAT','LION','MINK','WOLF','STOAT','TIGER','OTTER','PANDA','ZEBRA','HORSE','MOOSE','RHINO','BISON','SNAKE','EAGLE','FERRET','JAGUAR','BEAVER','BADGER','RABBIT','WOMBAT','IGUANA','LEOPARD','CHEETAH'],
  },
  {
    id: 'travel', name: 'Travel', color: '#FF7A8A',
    words: ['MAP','BAG','BUS','CAB','JET','BOAT','CITY','ROAD','TAXI','TOUR','VISA','CABIN','COAST','FERRY','GUIDE','HOTEL','PLANE','TRAIN','BRIDGE','CRUISE','FLIGHT','HARBOR','HOSTEL','RESORT','SCENIC','TICKET','BORDER','TUNNEL','JOURNEY','PASSPORT'],
  },
  {
    id: 'tools', name: 'Tools', color: '#9CB0C8',
    words: ['AWL','SAW','BOLT','FILE','JACK','NAIL','TAPE','VICE','ANVIL','BLADE','CLAMP','CRANE','DRILL','HINGE','LATHE','LEVEL','PLANE','PUNCH','SCREW','CHISEL','GRINDER','HAMMER','MALLET','PULLEY','ROUTER','SANDER','SOCKET','SQUARE','BRACKET','WRENCH'],
  },
  {
    id: 'home', name: 'Home', color: '#C68B5E',
    words: ['BED','RUG','DESK','DOOR','LAMP','SOFA','TILE','VASE','BENCH','CHAIR','CLOCK','COUCH','DRAPE','FRAME','TABLE','STOOL','SHELF','TOWEL','CLOSET','DRAWER','FAUCET','HANGER','MIRROR','PILLOW','WINDOW','BLANKET','CABINET','CURTAIN','CUSHION','SHUTTER'],
  },
  {
    id: 'colors', name: 'Colors', color: '#E04B6F',
    words: ['TAN','AQUA','BLUE','CYAN','GOLD','JADE','NAVY','PINK','RUBY','TEAL','AMBER','BEIGE','EBONY','IVORY','KHAKI','LILAC','MAUVE','OCHRE','OLIVE','TAUPE','BRONZE','COBALT','CORAL','MAROON','SILVER','SIENNA','INDIGO','VIOLET','CRIMSON','SCARLET'],
  },
  {
    id: 'body', name: 'Body', color: '#F08E5A',
    words: ['JAW','RIB','HIP','EAR','EYE','CALF','HAND','KNEE','LUNG','VEIN','WAIST','ANKLE','BICEP','BRAIN','CHEEK','CHEST','ELBOW','FEMUR','HEART','LIVER','NERVE','SKULL','SPINE','THUMB','TIBIA','THIGH','ARTERY','MUSCLE','PELVIS','TRICEP'],
  },
  {
    id: 'job', name: 'Jobs', color: '#6BD2E0',
    words: ['VET','CHEF','POET','ARTIST','ACTOR','BAKER','CODER','GUARD','JUDGE','MEDIC','MINER','NURSE','PILOT','SMITH','CLERK','BARBER','BANKER','DRIVER','FARMER','GROCER','LAWYER','RANGER','TAILOR','WELDER','WRITER','BUILDER','DENTIST','TEACHER','DOCTOR','TUTOR'],
  },
  {
    id: 'tech', name: 'Tech', color: '#39A8FF',
    words: ['APP','BIT','CPU','USB','WIFI','CHIP','CODE','DATA','DISK','NODE','BYTE','CACHE','CLOUD','DRONE','MODEM','MOUSE','PIXEL','PROXY','ROBOT','CABLE','KERNEL','LAPTOP','LOGIN','NEURAL','SCREEN','SENSOR','SERVER','BINARY','BROWSER','NETWORK'],
  },
  {
    id: 'school', name: 'School', color: '#E0B85C',
    words: ['PEN','ART','GYM','BOOK','DESK','EXAM','QUIZ','TEST','ATLAS','BOARD','CHALK','CLASS','ESSAY','GRADE','RULER','PAPER','BINDER','CANVAS','ERASER','FOLDER','LESSON','LOCKER','MARKER','PENCIL','REPORT','TUTOR','COMPASS','HALLWAY','LIBRARY','STUDENT'],
  },
  {
    id: 'garden', name: 'Garden', color: '#86C95B',
    words: ['SOD','HOE','DIG','BUD','HOSE','LAWN','LEAF','PEAT','ROSE','SEED','SOIL','VINE','WEED','BULB','PATCH','HEDGE','MULCH','PETAL','RAKE','SPADE','SHRUB','STALK','BLOOM','THORN','CLOVER','NECTAR','SPROUT','BARROW','BLOSSOM','TROWEL'],
  },
  {
    id: 'birds', name: 'Birds', color: '#FF8C5C',
    words: ['JAY','OWL','EMU','CROW','DOVE','DUCK','HAWK','IBIS','KITE','WREN','CRANE','FINCH','HERON','QUAIL','RAVEN','ROBIN','SWIFT','SWAN','EAGLE','MARTIN','PIGEON','PARROT','TOUCAN','MAGPIE','CONDOR','THRUSH','SPARROW','PEACOCK','PELICAN','FLAMINGO'],
  },
  {
    id: 'gems', name: 'Gems', color: '#9D7AF2',
    words: ['GEM','JADE','ONYX','OPAL','RUBY','SARD','TOPAZ','AMBER','AGATE','BERYL','CORAL','PEARL','LAPIS','ROCK','SPINEL','GARNET','JASPER','QUARTZ','ZIRCON','CITRINE','DIAMOND','EMERALD','PERIDOT','OBSIDIAN','FLUORITE','SAPPHIRE','AMETHYST','MALACHITE','SUNSTONE','MOONSTONE'],
  },
  {
    id: 'farm', name: 'Farm', color: '#B58A4F',
    words: ['PIG','HEN','COW','OX','HAY','BARN','BULL','CALF','CROP','DUCK','FARM','FOAL','GOAT','LAMB','OATS','PLOW','SILO','FENCE','FIELD','GRAIN','HORSE','SHEEP','STABLE','TURKEY','DONKEY','RABBIT','ROOSTER','TRACTOR','HARVEST','PASTURE'],
  },
  {
    id: 'baking', name: 'Baking', color: '#E095BC',
    words: ['EGG','TART','SALT','BATTER','CAKE','CREAM','DOUGH','FLOUR','GLAZE','ICING','YEAST','BREAD','SUGAR','BUTTER','COOKIE','MUFFIN','PASTRY','TOFFEE','BROWNIE','CARAMEL','FONDANT','GANACHE','NUTMEG','PRALINE','VANILLA','BISCUIT','CINNAMON','MOLASSES','OVEN','MIXER'],
  },
  {
    id: 'metals', name: 'Metals', color: '#A8B6CC',
    words: ['TIN','IRON','GOLD','LEAD','ZINC','ALLOY','BRASS','STEEL','BARIUM','COBALT','COPPER','INDIUM','SODIUM','BRONZE','NICKEL','SILVER','CHROME','ARSENIC','BISMUTH','CALCIUM','LITHIUM','MERCURY','RHODIUM','URANIUM','VANADIUM','ANTIMONY','PLATINUM','TITANIUM','TUNGSTEN','MAGNESIUM'],
  },
  {
    id: 'shapes', name: 'Shapes', color: '#74B5F2',
    words: ['ARC','CONE','CUBE','DISC','RING','STAR','ARROW','CROSS','HELIX','KITE','OVAL','TORUS','WEDGE','CIRCLE','SPIRAL','SPHERE','SQUARE','PRISM','RHOMBUS','POLYGON','HEXAGON','OCTAGON','PYRAMID','ELLIPSE','DIAMOND','CYLINDER','CRESCENT','PENTAGON','TRIANGLE','TRAPEZOID'],
  },
  {
    id: 'drinks', name: 'Drinks', color: '#5DC6A8',
    words: ['ALE','GIN','RUM','TEA','BEER','MEAD','MILK','SAKE','SODA','WINE','BROTH','CIDER','COCOA','JUICE','MOCHA','PUNCH','VODKA','WATER','BRANDY','COFFEE','EGGNOG','JULEP','LATTE','NECTAR','SPIRIT','SQUASH','TEQUILA','CORDIAL','KOMBUCHA','HORCHATA'],
  },
  {
    id: 'gym', name: 'Fitness', color: '#FF6B9F',
    words: ['REP','SET','GYM','CURL','FLEX','JUMP','LAPS','LIFT','BRACE','BENCH','PEDAL','PRESS','PLANK','SQUAT','LUNGE','BURPEE','CARDIO','CRUNCH','ENDURE','PULLUP','PUSHUP','SPRINT','WARMUP','WEIGHT','BARBELL','COOLDOWN','DEADLIFT','DUMBBELL','STRETCH','TREADMILL'],
  },
  {
    id: 'feels', name: 'Feelings', color: '#C788F0',
    words: ['AWE','JOY','SAD','CALM','DREAD','FEAR','GLAD','HOPE','LOVE','PITY','RAGE','BLISS','BRAVE','GRIEF','GUILT','SHAME','SHOCK','PROUD','HAPPY','ANGRY','ELATED','LONELY','BORED','SCARED','SERENE','TENDER','ANXIOUS','CONTENT','EXCITED','NERVOUS'],
  },
  {
    id: 'numbers', name: 'Numbers', color: '#65BB7D',
    words: ['ONE','TWO','SIX','TEN','ZERO','FIVE','FOUR','NINE','DOZEN','NAUGHT','EIGHT','FORTY','FIFTY','SIXTY','THREE','SEVEN','EIGHTY','NINETY','ELEVEN','THIRTY','TWENTY','TWELVE','SIXTEEN','FIFTEEN','SEVENTY','HUNDRED','MILLION','BILLION','TRILLION','THIRTEEN'],
  },
  {
    id: 'desert', name: 'Desert', color: '#E0A55C',
    words: ['DRY','SUN','ARID','DUSK','GOBI','HEAT','MESA','PALM','SAND','VIPER','ADOBE','CAMEL','CACTI','DUNE','GECKO','LIZARD','MIRAGE','NOMAD','OASIS','SNAKE','THORN','CANYON','SAHARA','SUNSET','CACTUS','VULTURE','CARAVAN','BEDOUIN','DROUGHT','SCORPION'],
  },
  {
    id: 'arctic', name: 'Arctic', color: '#7DBCE0',
    words: ['ICE','BERG','COLD','FLOE','SLED','SNOW','POLAR','DRIFT','FJORD','FROST','HUSKY','PARKA','RAVEN','SLEET','STORM','WHALE','AURORA','ESKIMO','FROZEN','IGLOO','LICHEN','WALRUS','TUNDRA','PENGUIN','GLACIER','SNOWFALL','REINDEER','BLIZZARD','BOREALIS','SEAL'],
  },
  {
    id: 'jungle', name: 'Jungle', color: '#52B377',
    words: ['APE','BUG','TOAD','FERN','FROG','LEAF','LIANA','DENSE','HUMID','MACAW','SNAKE','TAPIR','VINES','BAMBOO','BEETLE','CANOPY','GECKO','MANTIS','MONKEY','ORCHID','PARROT','PYTHON','SLOTH','TOUCAN','JAGUAR','TERMITE','ANACONDA','LEOPARD','MACAQUE','CHAMELEON'],
  },
  {
    id: 'magic', name: 'Magic', color: '#9457E0',
    words: ['HEX','ORB','CLOAK','CURSE','FAIRY','GHOST','MAGIC','RELIC','RUNE','SIGIL','SPELL','TOTEM','WAND','WITCH','CHARM','SPRITE','AMULET','ARCANE','DRAGON','ELIXIR','MYSTIC','PORTAL','RITUAL','SCROLL','WIZARD','CRYSTAL','ENCHANT','POTION','WARLOCK','SORCERER'],
  },
];
