import type { QrshopProduct } from '@/types/qrshop';

const PRODUCT_IMAGE = '/assets/qrshop/product-placeholder.png';

export const qrshopProducts: QrshopProduct[] = [
  {
    id: 'keyring-black',
    categoryId: 'keyring',
    categoryName: '키링',
    name: '무슨무슨 키링',
    option: 'BLACK',
    price: 15_000,
    imageUrl: PRODUCT_IMAGE,
  },
  {
    id: 'keyring-orange',
    categoryId: 'keyring',
    categoryName: '키링',
    name: '무슨무슨 키링',
    option: 'ORANGE',
    price: 15_000,
    imageUrl: PRODUCT_IMAGE,
  },
  {
    id: 'postcard-lotus',
    categoryId: 'stationery',
    categoryName: '문구',
    name: '연꽃 엽서',
    option: 'ORANGE',
    price: 2_000,
    imageUrl: PRODUCT_IMAGE,
  },
  {
    id: 'postcard-wish',
    categoryId: 'stationery',
    categoryName: '문구',
    name: '소원 엽서',
    option: 'BLUE',
    price: 2_000,
    imageUrl: PRODUCT_IMAGE,
  },
  {
    id: 'tshirt-small',
    categoryId: 'apparel',
    categoryName: '의류',
    name: '피그먼트 티셔츠',
    option: 'S',
    price: 55_000,
    imageUrl: PRODUCT_IMAGE,
  },
  {
    id: 'tshirt-large',
    categoryId: 'apparel',
    categoryName: '의류',
    name: '피그먼트 티셔츠',
    option: 'L',
    price: 55_000,
    imageUrl: PRODUCT_IMAGE,
  },
];
