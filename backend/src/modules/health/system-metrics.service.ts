import { Injectable } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class SystemMetricsService {
  getMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      uptimeSec: Math.round(os.uptime()),
      processUptimeSec: Math.round(process.uptime()),
      memory: {
        totalBytes: totalMem,
        usedBytes: usedMem,
        freeBytes: freeMem,
        usedPercent: totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0,
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage1m: loadAvg[0],
        loadAverage5m: loadAvg[1],
        loadAverage15m: loadAvg[2],
      },
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  }
}
