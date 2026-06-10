import { CommandHandler } from './command-handler.js';
import { loadConfig } from './config.js';
import { createMqttClient, startHeartbeat } from './heartbeat.js';
import { OutputController } from './output-controller.js';

const config = loadConfig();
const outputs = new OutputController(config.outputCount);
const log = (message: string): void => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const client = createMqttClient(config);

const highlightTopic = `${config.topicPrefix}/${config.deviceId}/highlight`;
const offTopic = `${config.topicPrefix}/${config.deviceId}/off`;
const resetTopic = `${config.topicPrefix}/reset`;

const handler = new CommandHandler(config, outputs, log);

client.on('connect', () => {
  log(`Connected to MQTT ${config.brokerUrl} as device ${config.deviceId}`);

  client.subscribe([highlightTopic, offTopic, resetTopic], { qos: 1 }, (error) => {
    if (error) {
      log(`Subscribe failed: ${error.message}`);
      return;
    }
    log(`Subscribed: ${highlightTopic}, ${offTopic}, ${resetTopic}`);
  });

  startHeartbeat(client, config, () => process.env.RASPI_IP ?? '127.0.0.1');
});

client.on('message', (topic, buffer) => {
  handler.handle(topic, buffer.toString());
});

client.on('error', (error) => {
  log(`MQTT error: ${error.message}`);
});

process.on('SIGINT', () => {
  log('Shutting down');
  client.end(true, {}, () => process.exit(0));
});

log(
  `Visual Location Raspi Client starting (outputs=${config.outputCount}, simulator=${config.simulatorMode})`,
);
