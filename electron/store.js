const Store = require('electron-store');
const { randomBytes } = require('crypto');

const schema = {
  rpcSecret: { type: 'string' },
  theme: { type: 'string', enum: ['dark', 'light'], default: 'dark' },
  minimizeToTrayOnClose: { type: 'boolean', default: true },
  defaultInterface: { type: ['string', 'null'], default: null },
  maxConnectionsPerDownload: { type: 'number', default: 8, minimum: 1, maximum: 32 },
  maxConcurrentDownloads: { type: 'number', default: 3, minimum: 1 },
  maxOverallDownloadLimit: { type: 'string', default: '0' }, // '0' = unlimited, aria2 format e.g. '2M'
  maxOverallUploadLimit: { type: 'string', default: '0' },
  categories: {
    type: 'object',
    default: {
      Video: { extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'], dir: '' },
      Music: { extensions: ['mp3', 'flac', 'wav', 'aac', 'ogg'], dir: '' },
      Documents: { extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'], dir: '' },
      Compressed: { extensions: ['zip', 'rar', '7z', 'tar', 'gz'], dir: '' },
      Programs: { extensions: ['exe', 'msi'], dir: '' },
      Other: { extensions: [], dir: '' }
    }
  },
  proxy: { type: 'string', default: '' },
  postDownload: {
    type: 'object',
    default: { autoExtract: false, runCommand: '', shutdownWhenDone: false }
  }
};

const store = new Store({ schema, defaults: { rpcSecret: randomBytes(16).toString('hex') } });

module.exports = store;
