import axios from 'axios';
import 'dotenv/config';

const apiKey = process.env.DUST_API_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// 경보 단계 구분
const getGradeText = (grade) => {
    return (
        {
            주의보: '주의보 ⚠️',
            경보: '경보 🚨',
            해제: '해제 ✅',
        }[grade] || '정보 없음 ❓'
    );
};

(async () => {
    try {
        if (!apiKey) {
            console.error('❌ DUST_API_KEY가 설정되지 않았습니다.');
            return;
        }

        // 오늘 날짜 계산 (YYYYMMDD 형식)
        const today = new Date();
        const searchDate = today.toISOString().slice(0, 10);
        // console.log(searchDate);
        // API 요청 URL 수정
        const url = `https://apis.data.go.kr/B552584/MinuDustFrcstDspthSvc/getMinuDustFrcstDspth50Over?serviceKey=${apiKey}&returnType=json&numOfRows=10&pageNo=1&searchDate=${searchDate}`;
        // returnType=json&numOfRows=1&pageNo=1&searchDate=2025-04-03
        // API 요청 헤더 추가
        const response = await axios.get(url, {
            headers: {
                Accept: 'application/json',
            },
        });
        console.log(response.data);

        // 응답 데이터 처리
        if (!response.data || !response.data.response || !response.data.response.body) {
            console.error('API 응답 형식이 올바르지 않습니다.');
            return;
        }

        // 응답 데이터 로깅
        console.log('API 응답:', JSON.stringify(response.data, null, 2));

        const items = response.data.response.body.items;
        if (!items || (Array.isArray(items) && items.length === 0)) {
            console.log('미세먼지 예보 정보가 없습니다.');
            return;
        }

        // 가장 최근 예보 정보 가져오기
        const latestForecast = items[0];
        const dataTime = latestForecast.dataTime;
        const informOverall = latestForecast.informOverall;
        const informCause = latestForecast.informCause;

        // 메시지 생성
        const message = `*미세먼지 예보*\n\n${dataTime}\n\n${informOverall.trim()}\n\n${informCause.trim()}`;

        // 텔레그램으로 메시지 전송
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
        });
        console.log(message);

        console.log('✅ 텔레그램 전송 완료');
    } catch (error) {
        console.error('❌ 오류:', error.message);
        if (error.response) {
            console.error('API 응답:', JSON.stringify(error.response.data, null, 2));
        }
    }
})();
