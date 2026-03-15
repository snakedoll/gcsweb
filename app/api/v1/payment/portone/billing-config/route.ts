import { NextResponse } from 'next/server';
import {
  getPortoneBillingChannelKey,
  getPortonePaymentConfig,
  isPortoneConfigured,
} from '@/lib/payment/portone';

/** Fund 빌링키 발급용 storeId, channelKey 반환 */
export async function GET() {
  const impCode = process.env.PORTONE_V1_IMP_CODE?.trim() ?? '';
  const billingPg = process.env.PORTONE_BILLING_PG?.trim() ?? '';
  if (impCode && billingPg) {
    return NextResponse.json({
      status: 'success',
      data: { mode: 'v1', impCode, billingPg },
    });
  }

  if (!isPortoneConfigured()) {
    return NextResponse.json(
      { status: 'error', code: 'NOT_CONFIGURED', message: 'PortOne not configured' },
      { status: 503 },
    );
  }

  const { storeId } = getPortonePaymentConfig();
  const channelKey = getPortoneBillingChannelKey();

  return NextResponse.json({
    status: 'success',
    data: { mode: 'v2', storeId, channelKey },
  });
}
