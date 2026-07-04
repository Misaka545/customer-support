/**
 * RAG (Retrieval-Augmented Generation) Service
 * Pipeline: câu hỏi → embedding → vector search → LLM generation
 * Sử dụng Gemini API
 */
const KnowledgeBase = require('../models/KnowledgeBase');

/**
 * Tính cosine similarity giữa 2 vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

/**
 * Tìm kiếm các chunk liên quan nhất bằng vector similarity
 * @param {number[]} queryEmbedding - Vector của câu hỏi
 * @param {number} topK - Số lượng kết quả trả về
 * @returns {object[]} Các chunk có similarity cao nhất
 */
async function searchRelevantChunks(queryEmbedding, topK = 5) {
  const documents = await KnowledgeBase.find({ status: 'ready' });

  const results = [];

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      if (chunk.embedding && chunk.embedding.length > 0) {
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
        results.push({
          content: chunk.content,
          similarity,
          documentName: doc.originalName,
        });
      }
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, topK);
}

/**
 * Keyword search fallback (khi không có embedding)
 */
async function keywordSearch(query, topK = 5) {
  const documents = await KnowledgeBase.find({ status: 'ready' });
  const results = [];
  const queryWords = query.toLowerCase().split(/\s+/);

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      const chunkLower = chunk.content.toLowerCase();
      let score = 0;

      for (const word of queryWords) {
        if (word.length > 2 && chunkLower.includes(word)) {
          score += 1;
        }
      }

      if (score > 0) {
        results.push({
          content: chunk.content,
          similarity: score / queryWords.length,
          documentName: doc.originalName,
        });
      }
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * System prompt cho RAG
 */
const SYSTEM_PROMPT = `Bạn là một tư vấn viên chuyên nghiệp và thân thiện. Bạn CHỈ ĐƯỢC PHÉP trả lời dựa trên thông tin có trong tài liệu được cung cấp bên dưới.

NGUYÊN TẮC TUYỆT ĐỐI:
1. Nếu câu hỏi CÓ câu trả lời trong tài liệu: Trả lời tự nhiên, đầy đủ, dễ hiểu. Dùng emoji phù hợp.
2. Nếu câu hỏi KHÔNG CÓ trong tài liệu hoặc bạn KHÔNG CHẮC CHẮN: Tuyệt đối KHÔNG bịa ra thông tin. Thay vào đó, trả về JSON theo định dạng sau:

{"handoff": true, "message": "Dạ, em chưa tìm thấy chính xác thông tin này trong tài liệu. Em đang kết nối anh/chị với nhân viên hỗ trợ trực tiếp.", "suggestions": ["Câu gợi ý 1 liên quan đến ngữ cảnh", "Câu gợi ý 2", "Câu gợi ý 3"]}

3. LUÔN trả lời bằng tiếng Việt.
4. Xưng "em" với khách hàng, gọi khách là "anh/chị".
5. Giữ câu trả lời ngắn gọn, dễ hiểu (tối đa 3-4 câu).`;

/**
 * Xử lý tin nhắn qua RAG pipeline
 * @param {string} message - Câu hỏi từ khách hàng
 * @param {object[]} chatHistory - Lịch sử chat (tùy chọn)
 * @returns {object} { response, shouldHandoff, suggestions }
 */
async function processWithRAG(message, chatHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const botService = require('./bot');
    return botService.processMessage(message);
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embResult = await embeddingModel.embedContent(message);
    const queryEmbedding = embResult.embedding.values;
    let relevantChunks = await searchRelevantChunks(queryEmbedding);

    if (relevantChunks.length === 0 || relevantChunks[0].similarity < 0.3) {
      const kwResults = await keywordSearch(message);
      if (kwResults.length > 0) {
        relevantChunks = kwResults;
      }
    }
    let context = '';
    if (relevantChunks.length > 0) {
      context = relevantChunks
        .map((chunk, i) => `[Tài liệu ${i + 1} - ${chunk.documentName}]:\n${chunk.content}`)
        .join('\n\n---\n\n');
    } else {
      context = '(Không tìm thấy tài liệu nào liên quan)';
    }
    const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `${SYSTEM_PROMPT}

TÀI LIỆU THAM KHẢO:
${context}

LỊCH SỬ HỘI THOẠI:
${chatHistory.slice(-6).map(m => `${m.sender}: ${m.content}`).join('\n')}

CÂU HỎI CỦA KHÁCH HÀNG:
${message}

TRẢ LỜI:`;

    const result = await chatModel.generateContent(prompt);
    const responseText = result.response.text().trim();

    try {
      const cleaned = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.handoff === true) {
        return {
          response: parsed.message || 'Đang kết nối bạn với nhân viên hỗ trợ...',
          shouldHandoff: true,
          suggestions: parsed.suggestions || [],
        };
      }
    } catch {}

    return {
      response: responseText,
      shouldHandoff: false,
      suggestions: [],
    };
  } catch (error) {
    console.error('RAG pipeline error:', error.message);
    const botService = require('./bot');
    return botService.processMessage(message);
  }
}

/**
 * Kiểm tra xem hệ thống có Knowledge Base hay chưa
 */
async function hasKnowledgeBase() {
  const count = await KnowledgeBase.countDocuments({ status: 'ready' });
  return count > 0;
}

module.exports = { processWithRAG, hasKnowledgeBase, searchRelevantChunks };
