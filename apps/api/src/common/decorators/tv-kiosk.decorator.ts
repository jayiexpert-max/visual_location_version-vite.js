import { SetMetadata } from '@nestjs/common';

export const TV_KIOSK_KEY = 'tvKiosk';

/** Marks a route as accepting X-TV-Kiosk-Key authentication. */
export const TvKiosk = () => SetMetadata(TV_KIOSK_KEY, true);
