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
const PM10_BAD = 81; // 미세먼지 나쁨 기준
const PM25_BAD = 36; // 초미세먼지 나쁨 기준

async function fetchDustData(itemCode) {
    try {
        // 오늘 날짜 계산 (YYYYMMDD 형식)
        const today = new Date();
        const searchDate = today.toISOString().slice(0, 10).replace(/-/g, '');

        const url = `http://apis.data.go.kr/B552584/ArpltnStatsSvc/getCtprvnMesureLIst?serviceKey=${apiKey}&returnType=json&numOfRows=100&pageNo=1&itemCode=${itemCode}&searchDate=${searchDate}&sidoName=전국`;
        console.log(`요청 URL: ${url}`);
        
        const response = await axios.get(url);
        console.log(`${itemCode} API 응답:`, JSON.stringify(response.data, null, 2));
        
        if (!response.data || !response.data.response) {
            console.error(`${itemCode} 응답에 'response' 객체가 없습니다.`);
            return [];
        }
        
        if (!response.data.response.body) {
            console.error(`${itemCode} 응답에 'body' 객체가 없습니다.`);
            return [];
        }
        
        if (!response.data.response.body.items) {
            console.error(`${itemCode} 응답에 'items' 배열이 없습니다.`);
            return [];
        }
        
        return response.data.response.body.items;
    } catch (error) {
        console.error(`${itemCode} 데이터 가져오기 오류:`, error.message);
        return [];
    }
}

(async () => {
    try {
        if (!apiKey) {
            console.error('❌ DUST_API_KEY가 설정되지 않았습니다.');
            return;
        }

        console.log('미세먼지 데이터 조회 시작...');
        
        // PM10과 PM25 데이터 각각 요청
        const pm10Items = await fetchDustData('PM10');
        const pm25Items = await fetchDustData('PM25');

        if (pm10Items.length === 0 && pm25Items.length === 0) {
            console.error('❌ 미세먼지 데이터를 가져올 수 없습니다.');
            return;
        }

        const pm10BadAreas = [];
        const pm25BadAreas = [];

        // PM10 데이터 처리
        pm10Items.forEach((item) => {
            const area = item.sidoName;
            const pm10 = Number(item.informValue || 0);
            
            if (isNaN(pm10)) {
                console.warn(`'${area}'의 PM10 값이 숫자가 아닙니다: ${item.informValue}`);
                return;
            }
            
            const pm10GradeText = getGradeText(pm10, 'PM10');

            if (pm10 >= PM10_BAD) {
                pm10BadAreas.push(`• ${area}: ${pm10}㎍/㎥ (${pm10GradeText})`);
            }
        });

        // PM25 데이터 처리
        pm25Items.forEach((item) => {
            const area = item.sidoName;
            const pm25 = Number(item.informValue || 0);
            
            if (isNaN(pm25)) {
                console.warn(`'${area}'의 PM2.5 값이 숫자가 아닙니다: ${item.informValue}`);
                return;
            }
            
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
            console.log('메시지 전송 중...');
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            });
            console.log('✅ 텔레그램 전송 완료');
        } else {
            console.log('📌 나쁨 수준의 미세먼지가 없습니다.');
        }
    } catch (error) {
        console.error('❌ 오류:', error.message);
        if (error.response) {
            console.error('API 응답:', JSON.stringify(error.response.data, null, 2));
        }
    }
})();
