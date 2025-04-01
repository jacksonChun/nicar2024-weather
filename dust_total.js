import axios from 'axios';

const apiKey = process.env.DUST_API_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// 미세먼지 단계 구분
const getGradeText = (grade) => {
    return (
        {
            1: '좋음 😊',
            2: '보통 😐',
            3: '나쁨 😷',
            4: '매우나쁨 💀',
        }[grade] || '정보 없음 ❓'
    );
};

// 기준 수치
const PM10_BAD = 3; // 알림 단계
const PM25_BAD = 3; // 알림 단계

(async () => {
    try {
        const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${apiKey}&returnType=json&numOfRows=100&pageNo=1&sidoName=전국&ver=1.0`;
        const { data } = await axios.get(url);
        const items = data.response.body.items;

        const pm10BadAreas = [];
        const pm25BadAreas = [];

        items.forEach((item) => {
            const area = item.sidoName;
            const pm10 = Number(item.pm10Value);
            const pm25 = Number(item.pm25Value);
            const pm10GradeText = getGradeText(item.pm10Grade);
            const pm25GradeText = getGradeText(item.pm25Grade);

            if (item.pm10Grade >= PM10_BAD) {
                pm10BadAreas.push(`• ${area}: ${pm10}㎍/㎥ (${pm10GradeText})`);
            }

            if (item.pm25Grade >= PM25_BAD) {
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
        // message += '✅ 모든 지역의 미세먼지 수치가 양호합니다.';

        if (pm10BadAreas.length !== 0 && pm25BadAreas.length !== 0) {
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
    }
})();
