// Photography by Vitaly Gariev on Unsplash, free under the Unsplash License.
// https://unsplash.com/@silverkblack
const base = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

export const PHOTOS = {
  womanPhone: { src: (w = 1400) => base('photo-1758691031979-6128d4029604', w), alt: 'An older woman in a pink cardigan smiling at her phone' },
  manTablet: { src: (w = 1400) => base('photo-1758691030790-efe4c90a1ca6', w), alt: 'An older man smiling as he uses a tablet on his sofa' },
};

export const PHOTO_CREDIT = { name: 'Vitaly Gariev', url: 'https://unsplash.com/@silverkblack' };
