import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import api from './api';

window.Pusher = Pusher;

const apiBaseUrl = api.defaults.baseURL || '';
const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
const reverbPort = Number(import.meta.env.VITE_REVERB_PORT || 8091);

const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY || 'hru-ats-key',
  wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
  wsPort: reverbPort,
  wssPort: reverbPort,
  forceTLS: reverbScheme === 'https',
  enabledTransports: ['ws', 'wss'],

  authorizer: (channel) => ({
    authorize: async (socketId, callback) => {
      try {
        const response = await api.post(`${backendBaseUrl}/broadcasting/auth`, {
          socket_id: socketId,
          channel_name: channel.name,
        });

        callback(false, response.data);
      } catch (error) {
        callback(true, error);
      }
    },
  }),
});

export default echo;
