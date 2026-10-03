import type { ReferenceBoard } from './material-types';
import { gameReferenceBoards } from './reference-game-boards';
import { appReferenceBoards } from './reference-app-boards';
import landscape from '../assets/landscape.png';
import forms from '../assets/forms.png';

export const referenceBoards: ReferenceBoard[] = [
  ...gameReferenceBoards,
  ...appReferenceBoards,
  { id: 'landscape-foundations', name: '山水空间 · 青绿、小景与园林', category: 'scene', description: '原有三组空间观察：山势展开、偏侧留白与园林框景；原创现代研究示意。', traditionIds: ['blue-green-landscape', 'southern-song', 'garden'], tags: ['青绿', '留白', '框景', '空间'], image: landscape, filename: 'landscape.png' },
  { id: 'form-foundations', name: '器物与图形 · 漆器、细线与木版', category: 'prop', description: '原有朱黑器物、细线设色与木版式色层的对照，观察轮廓和用色职责。', traditionIds: ['han-lacquer', 'song-bird-flower', 'woodblock'], tags: ['器物', '线描', '木版', '设色'], image: forms, filename: 'forms.png' },
];
