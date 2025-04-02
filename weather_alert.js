import axios from 'axios';
import 'dotenv/config';

const apiKey = process.env.WEATHER_API_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// 날씨 상태에 따른 이모지
const getWeatherEmoji = (category, value) => {
    switch (category) {
        case 'PTY': // 강수형태
            switch (value) {
                case '0':
                    return '☀️ 맑음';
                case '1':
                    return '🌧️ 비';
                case '2':
                    return '🌧️ 비/눈';
                case '3':
                    return '🌨️ 눈';
                case '4':
                    return '🌧️ 소나기';
                default:
                    return '☀️ 맑음';
            }
        case 'SKY': // 하늘상태
            switch (value) {
                case '1':
                    return '☀️ 맑음';
                case '3':
                    return '☁️ 흐림';
                case '4':
                    return '☁️ 흐림';
                default:
                    return '☀️ 맑음';
            }
        case 'TMP': // 기온
            return `${value}°C`;
        case 'REH': // 습도
            return `${value}%`;
        case 'WSD': // 풍속
            return `${value}m/s`;
        default:
            return value;
    }
};

// 날씨 카테고리 한글명
const getCategoryName = (category) => {
    const categories = {
        PTY: '강수형태',
        REH: '습도',
        SKY: '하늘상태',
        TMP: '기온',
        WSD: '풍속',
    };
    return categories[category] || category;
};

(async () => {
    try {
        // 현재 시간 기준으로 날짜와 시간 계산
        const now = new Date();
        const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
        const baseTime = now.getHours().toString().padStart(2, '0') + '00';

        // 서울의 위도/경도 좌표
        const nx = '60'; // 서울 강남구
        const ny = '127';

        const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=${apiKey}&numOfRows=100&pageNo=1&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

        const { data } = await axios.get(url);
        const items = data.response.body.items.item;

        if (!items || items.length === 0) {
            console.log('❌ 날씨 데이터를 가져올 수 없습니다.');
            return;
        }

        // 메시지 생성
        let message = `*🌤️ 서울 강남구 날씨 예보 (${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(
            6,
            8
        )} ${baseTime.slice(0, 2)}:${baseTime.slice(2, 4)} 기준)*\n\n`;

        // 시간별 데이터 그룹화
        const timeGroups = {};
        items.forEach((item) => {
            const fcstTime = item.fcstTime;
            if (!timeGroups[fcstTime]) {
                timeGroups[fcstTime] = {};
            }
            timeGroups[fcstTime][item.category] = item.fcstValue;
        });

        // 시간별로 메시지 생성
        Object.entries(timeGroups).forEach(([time, data]) => {
            const timeStr = `${time.slice(0, 2)}:${time.slice(2, 4)}`;
            message += `*${timeStr}*\n`;

            // 강수형태와 하늘상태는 하나로 통합
            if (data.PTY && data.PTY !== '0') {
                message += `• ${getWeatherEmoji('PTY', data.PTY)}\n`;
            } else {
                message += `• ${getWeatherEmoji('SKY', data.SKY)}\n`;
            }

            message += `• 기온: ${getWeatherEmoji('TMP', data.TMP)}\n`;
            message += `• 습도: ${getWeatherEmoji('REH', data.REH)}\n`;
            message += `• 풍속: ${getWeatherEmoji('WSD', data.WSD)}\n\n`;
        });

        // 메시지 전송
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
        });

        console.log('✅ 텔레그램 전송 완료');
    } catch (error) {
        console.error('❌ 오류:', error.message);
    }
})();
