import log4js from 'log4js';
import moment from 'moment-timezone'

const vietnamTimeZone = 'Asia/Ho_Chi_Minh';
moment.tz.setDefault(vietnamTimeZone);

export const configLog = log4js.configure({
    appenders: {
      file: {
        type: 'dateFile',
        filename: 'logs/log',
        pattern: 'dd-MM-yyyy.log', // Tên file là ngày (yyyy-mm-dd).log
        alwaysIncludePattern: true,  // Tạo file mới mỗi khi ứng dụng bắt đầu
        layout: {
          type: 'pattern',
          pattern: '[%d{ISO8601_WITH_TZ_OFFSET}] [%p] %c - %m%n',
        },
      }
    },
    categories: {
      default: { appenders: ['file'], level: 'info' }
    }
});