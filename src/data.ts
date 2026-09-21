import tempImg from './assets/images/target_temperature_1789987618517.jpg';
import headacheImg from './assets/images/target_headache_1789987961502.jpg';
import backacheImg from './assets/images/target_backache_1789987974310.jpg';
import runnyNoseImg from './assets/images/target_runnynose_1789987984484.jpg';
import earacheImg from './assets/images/target_earache_1789987995505.jpg';
import stomachImg from './assets/images/target_stomachache_1789988009177.jpg';
import soreThroatImg from './assets/images/target_sorethroat_1789988018559.jpg';
import coughImg from './assets/images/target_cough_1789988029017.jpg';
import pubgBgImg from './assets/images/pubg_battlefield_bg_1789988601520.jpg';
import { VocabularyItem } from './types';

export const PUBG_BG = pubgBgImg;

export const VOCABULARY_LIST: VocabularyItem[] = [
  {
    id: 'headache',
    phrase: "I’ve got a headache.",
    condition: "headache",
    image: headacheImg,
    hint: "Pain in the head or temples"
  },
  {
    id: 'backache',
    phrase: "I’ve got backache.",
    condition: "backache",
    image: backacheImg,
    hint: "Pain in the lower or upper back"
  },
  {
    id: 'runnynose',
    phrase: "I’ve got a runny nose.",
    condition: "runny nose",
    image: runnyNoseImg,
    hint: "Excess liquid flowing from the nose"
  },
  {
    id: 'earache',
    phrase: "I’ve got earache.",
    condition: "earache",
    image: earacheImg,
    hint: "Pain inside or around the ear"
  },
  {
    id: 'stomachache',
    phrase: "I’ve got stomach ache.",
    condition: "stomach ache",
    image: stomachImg,
    hint: "Pain or cramp in the belly"
  },
  {
    id: 'temperature',
    phrase: "I’ve got a temperature.",
    condition: "temperature / fever",
    image: tempImg,
    hint: "High body fever over 38°C"
  },
  {
    id: 'sorethroat',
    phrase: "I’ve got a sore throat.",
    condition: "sore throat",
    image: soreThroatImg,
    hint: "Pain or irritation in the throat or neck"
  },
  {
    id: 'badcough',
    phrase: "I’ve got a bad cough.",
    condition: "bad cough",
    image: coughImg,
    hint: "Forceful coughing from the chest"
  }
];
