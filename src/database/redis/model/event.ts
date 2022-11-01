import { Entity, Schema } from 'redis-om';
import redisClient from '../index';

class EventEntity extends Entity {}

const eventSchema = new Schema(
  EventEntity,
  {
    deliveryId: { type: 'string' },
    type: { type: 'string' },
  },
  {
    dataStructure: 'HASH',
  },
);

const Event = redisClient.fetchRepository(eventSchema);

Event.createIndex();

export default Event;