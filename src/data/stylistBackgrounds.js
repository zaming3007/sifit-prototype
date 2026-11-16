import scene1 from '../image/backgroud-aistylist/nenbg (1).png';
import scene2 from '../image/backgroud-aistylist/nenbg (2).png';
import scene3 from '../image/backgroud-aistylist/nenbg (3).png';
import scene4 from '../image/backgroud-aistylist/nenbg (4).png';
import decor1 from '../image/backgroud-aistylist/nen-removebg (1).png';
import decor2 from '../image/backgroud-aistylist/nen-removebg (2).png';
import decor3 from '../image/backgroud-aistylist/nen-removebg (3).png';
import decor4 from '../image/backgroud-aistylist/nen-removebg (4).png';

export const stylistBackgrounds = [
  { id: 'white', label: 'Phông trắng', image: null },
  ...[scene1, scene2, scene3, scene4].map((image, i) => ({ id: `scene-${i + 1}`, label: ['Studio ấm', 'Phố xanh', 'Nắng nhẹ', 'Boutique'][i], image, footRatio: [0.667, 0.692, 0.709, 0.7][i] })),
  ...[decor1, decor2, decor3, decor4].map((image, i) => ({ id: `decor-${i + 1}`, label: `Trang trí ${i + 1}`, image })),
];
