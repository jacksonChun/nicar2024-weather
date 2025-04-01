import axios from 'axios';
import 'dotenv/config';

const apiKey = process.env.DUST_API_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// 미세먼지 단계 구분
const getGradeText = (value, type) => {
    if (type === 'PM10') {
        if (value <= 30) return '좋음 😊';
        if (value <= 80) return '보통 😐';
        if (value <= 150) return '나쁨 😷';
        return '매우나쁨 💀';
    } else {
        // PM2.5
        if (value <= 15) return '좋음 😊';
        if (value <= 35) return '보통 😐';
        if (value <= 75) return '나쁨 😷';
        return '매우나쁨 💀';
    }
};

// 기준 수치
const PM10_BAD = 31; // 미세먼지 나쁨 기준
const PM25_BAD = 16; // 초미세먼지 나쁨 기준

async function fetchDustData(itemCode) {
    const url = `http://apis.data.go.kr/B552584/ArpltnStatsSvc/getCtprvnMesureLIst?serviceKey=${apiKey}&returnType=json&pageNo=1&dataGubun=HOUR&itemCode=${itemCode}`;
    const { data } = await axios.get(url);
    return data.response.body.items;
}

(async () => {
    try {
        // PM10과 PM25 데이터 각각 요청
        const [pm10Items, pm25Items] = await Promise.all([
            fetchDustData('PM10'),
            fetchDustData('PM25')
        ]);

        const pm10BadAreas = [];
        const pm25BadAreas = [];

        // PM10 데이터 처리
        pm10Items.forEach((item) => {
            const area = item.sidoName;
            const pm10 = Number(item.informValue);
            const pm10GradeText = getGradeText(pm10, 'PM10');

            if (pm10 >= PM10_BAD) {
                pm10BadAreas.push(`• ${area}: ${pm10}㎍/㎥ (${pm10GradeText})`);
            }
        });

        // PM25 데이터 처리
        pm25Items.forEach((item) => {
            const area = item.sidoName;
            const pm25 = Number(item.informValue);
            const pm25GradeText = getGradeText(pm25, 'PM25');

            if (pm25 >= PM25_BAD) {
                pm25BadAreas.push(`• ${area}: ${pm25}㎍/㎥ (${pm25GradeText})`);
            }
        });

        // 메시지 생성
        let message = '';

        if (pm10BadAreas.length) {
            message += `*미세먼지(PM10):*\n${pm10BadAreas.join('\n')}\n\n`;
        }

        if (pm25BadAreas.length) {
            message += `*초미세먼지(PM2.5):*\n${pm25BadAreas.join('\n')}\n\n`;
        }

        if (message) {
            // 메시지 전송
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            });
            console.log('✅ 텔레그램 전송 완료');
        }
    } catch (error) {
        console.error('❌ 오류:', error.message);
        if (error.response) {
            console.error('API 응답:', error.response.data);
        }
    }
})();
