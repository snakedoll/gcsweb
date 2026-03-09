/** Kakao(Daum) 우편번호 API */
interface DaumPostcodeData {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: 'R' | 'J';
  bname?: string;
  buildingName?: string;
  apartment?: string;
}

interface DaumPostcodeOption {
  oncomplete?: (data: DaumPostcodeData) => void;
}

interface DaumPostcode {
  new (option: DaumPostcodeOption): { open: () => void };
}

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcode };
    kakao?: { Postcode: DaumPostcode };
  }
}

export {};
