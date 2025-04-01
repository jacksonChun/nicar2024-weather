import axios from 'axios';
import 'dotenv/config';

const apiKey = process.env.DUST_API_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// 미세먼지 등급 구분
const getGradeEmoji = (value, type) => {
    if (type === 'PM10') {
        if (value <= 30) return '😊 좋음';
        if (value <= 80) return '😐 보통';
        if (value <= 150) return '😷 나쁨';
        return '💀 매우나쁨';
    } else {
        // PM2.5
        if (value <= 15) return '😊 좋음';
        if (value <= 35) return '😐 보통';
        if (value <= 75) return '😷 나쁨';
        return '💀 매우나쁨';
    }
};

const formatDate = (date) => {
    return date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
};

(async () => {
    try {
        // 어제 날짜 계산
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const searchDate = yesterday.toISOString().slice(0, 10).replace(/-/g, '');

        const url = `http://apis.data.go.kr/B552584/ArpltnStatsSvc/getCtprvnMesureLIst?serviceKey=${apiKey}&returnType=json&numOfRows=100&pageNo=1&searchCondition=DAILY&dataGubun=DAILY&searchDate=${searchDate}`;

        const { data } = await axios.get(url);
        
        // API 응답 전체 구조 로깅
        console.log('API 응답 전체 구조:', JSON.stringify(data, null, 2));
        
        // 첫 번째 아이템의 상세 구조 로깅
        if (data.response.body.items && data.response.body.items.length > 0) {
            console.log('\n첫 번째 아이템 상세 구조:', JSON.stringify(data.response.body.items[0], null, 2));
        }

        const items = data.response.body.items;

        if (!items || items.length === 0) {
            console.log('❌ 데이터를 가져올 수 없습니다.');
            return;
        }

        // 메시지 생성
        let message = `*📊 전국 미세먼지 일간 통계 (${formatDate(searchDate)})*\n\n`;

        items.forEach((item) => {
            const pm10Value = parseInt(item.pm10Value);
            const pm25Value = parseInt(item.pm25Value);

            message += `*${item.cityName}*\n`;
            message += `• PM10: ${pm10Value}㎍/㎥ (${getGradeEmoji(pm10Value, 'PM10')})\n`;
            message += `• PM2.5: ${pm25Value}㎍/㎥ (${getGradeEmoji(pm25Value, 'PM25')})\n\n`;
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
