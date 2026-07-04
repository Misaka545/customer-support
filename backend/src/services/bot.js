/**
 * Keyword-based Bot Service (Fallback khi không có Gemini API key)
 * Phân tích từ khóa trong tin nhắn khách hàng để trả lời tự động
 */

// Bảng phản hồi theo từ khóa
const keywordResponses = [
  {
    keywords: ['xin chào', 'hello', 'hi', 'chào', 'hey'],
    response: 'Xin chào!  Rất vui được hỗ trợ bạn. Bạn cần tôi giúp gì hôm nay?',
  },
  {
    keywords: ['giá', 'bao nhiêu', 'chi phí', 'phí', 'tiền', 'price', 'cost'],
    response: 'Về thông tin giá cả, bạn có thể cho tôi biết cụ thể sản phẩm/dịch vụ nào bạn quan tâm để tôi tư vấn chính xác hơn không? ',
  },
  {
    keywords: ['đăng ký', 'đăng kí', 'tạo tài khoản', 'register', 'signup'],
    response: 'Để đăng ký tài khoản, bạn có thể truy cập trang đăng ký trên website của chúng tôi. Bạn cần hỗ trợ bước nào cụ thể không? ',
  },
  {
    keywords: ['lỗi', 'bug', 'error', 'không được', 'hỏng', 'sự cố', 'vấn đề'],
    response: 'Tôi hiểu bạn đang gặp sự cố. Bạn có thể mô tả chi tiết lỗi gặp phải (bao gồm mã lỗi nếu có) để tôi hỗ trợ nhanh hơn không? ',
  },
  {
    keywords: ['cảm ơn', 'thank', 'thanks', 'tks'],
    response: 'Không có gì!  Rất vui được hỗ trợ bạn. Nếu cần thêm gì, đừng ngại hỏi nhé!',
  },
  {
    keywords: ['tạm biệt', 'bye', 'goodbye'],
    response: 'Tạm biệt bạn!  Chúc bạn một ngày tốt lành. Hẹn gặp lại!',
  },
  {
    keywords: ['gói cước', 'gói dịch vụ', 'package', 'plan', 'combo'],
    response: 'Chúng tôi có nhiều gói dịch vụ phù hợp với nhu cầu khác nhau. Bạn muốn tìm hiểu về gói nào cụ thể? Tôi có thể giúp so sánh các gói cho bạn. ',
  },
  {
    keywords: ['hỗ trợ', 'support', 'giúp đỡ', 'help'],
    response: 'Tôi sẵn sàng hỗ trợ bạn! Hãy cho tôi biết vấn đề cụ thể bạn đang gặp phải nhé. ',
  },
  {
    keywords: ['khuyến mãi', 'ưu đãi', 'giảm giá', 'sale', 'promotion', 'discount'],
    response: 'Hiện tại chúng tôi đang có một số chương trình ưu đãi hấp dẫn! Bạn muốn tìm hiểu ưu đãi cho sản phẩm/dịch vụ nào? ',
  },
];

const handoffKeywords = [
  'gặp nhân viên', 'nói chuyện với người thật', 'nhân viên hỗ trợ',
  'agent', 'human', 'talk to agent', 'người thật',
  'tư vấn viên', 'chuyển nhân viên', 'kết nối nhân viên',
];

function processMessage(message) {
  const lowerMessage = message.toLowerCase().trim();
  for (const keyword of handoffKeywords) {
    if (lowerMessage.includes(keyword)) {
      return {
        response: null,
        shouldHandoff: true,
        suggestions: [
          'Tôi muốn hỏi về giá dịch vụ',
          'Tôi đang gặp lỗi kỹ thuật',
          'Tôi cần tư vấn gói cước phù hợp',
        ],
      };
    }
  }

  for (const entry of keywordResponses) {
    for (const keyword of entry.keywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          response: entry.response,
          shouldHandoff: false,
          suggestions: [],
        };
      }
    }
  }

  return {
    response: 'Cảm ơn bạn đã liên hệ! Tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể diễn đạt lại hoặc gõ "Gặp nhân viên" để được hỗ trợ trực tiếp nhé! ',
    shouldHandoff: false,
    suggestions: [],
  };
}

module.exports = { processMessage };
