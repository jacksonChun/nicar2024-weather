// const axios = require('axios');
import axios from 'axios';
import 'dotenv/config'; // ES 모듈을 사용하는 경우

const sidoName = process.argv[2] || '서울'; // 커맨드라인 인자에서 지역명 받기
const apiKey = process.env.DUST_API_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

(async () => {
    try {
        const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${apiKey}&returnType=json&numOfRows=1&pageNo=1&sidoName=${encodeURIComponent(
            sidoName
        )}&ver=1.0`;
        const { data } = await axios.get(url);
        const item = data.response.body.items[0];
        const pm25 = Number(item.pm25Value);
        const grade = item.pm25Grade;

        const gradeText = {
            1: '좋음',
            2: '보통',
            3: '나쁨',
            4: '매우나쁨',
        };

        if (pm25 >= 36) {
            const message = `🚨 [${sidoName}] 미세먼지(PM2.5): ${pm25}㎍/㎥ (${gradeText[grade]})`;
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
            });
            console.log('✅ 텔레그램 메시지 전송 완료');
        } else {
            console.log(`ℹ️ [${sidoName}] 미세먼지 양호 (${pm25}㎍/㎥) - 메시지 생략`);
        }
    } catch (error) {
        console.error('⚠️ 오류 발생:', error.message);
    }
})();
