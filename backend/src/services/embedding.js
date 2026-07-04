/**
 * Document Embedding Service
 * Xử lý: đọc file → chia chunk → tạo embedding → lưu vào MongoDB
 */
const fs = require('fs');
const path = require('path');
const KnowledgeBase = require('../models/KnowledgeBase');

/**
 * Chia văn bản thành các chunk nhỏ
 * @param {string} text - Văn bản gốc
 * @param {number} chunkSize - Kích thước mỗi chunk (ký tự)
 * @param {number} overlap - Số ký tự chồng lấp giữa các chunk
 * @returns {string[]} Mảng các chunk
 */
function splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;

  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      const lastParagraph = text.lastIndexOf('\n\n', end);
      const lastSentence = text.lastIndexOf('. ', end);
      const lastNewline = text.lastIndexOf('\n', end);

      if (lastParagraph > start + chunkSize * 0.5) {
        end = lastParagraph + 2;
      } else if (lastSentence > start + chunkSize * 0.5) {
        end = lastSentence + 2;
      } else if (lastNewline > start + chunkSize * 0.5) {
        end = lastNewline + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start < 0) start = 0;
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Đọc nội dung file
 */
async function readFileContent(filePath, mimeType) {
  if (mimeType === 'text/plain') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  if (mimeType === 'application/pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF parse error:', error.message);
      throw new Error('Không thể đọc file PDF.');
    }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const data = fs.readFileSync(filePath);
      const text = data.toString('utf-8')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text;
    } catch (error) {
      throw new Error('Không thể đọc file DOCX.');
    }
  }

  throw new Error(`Định dạng file không được hỗ trợ: ${mimeType}`);
}

/**
 * Tạo embeddings bằng Gemini API
 * @param {string[]} texts - Mảng text cần embedding
 * @returns {number[][]} Mảng vectors
 */
async function createEmbeddings(texts) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('️  GEMINI_API_KEY chưa được cấu hình. Bỏ qua embedding.');
    return texts.map(() => []);
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const embeddings = [];
    const batchSize = 100;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const result = await model.batchEmbedContents({
        requests: batch.map(text => ({
          content: { parts: [{ text }] },
        })),
      });
      embeddings.push(...result.embeddings.map(e => e.values));
    }

    return embeddings;
  } catch (error) {
    console.error('Embedding error:', error.message);
    throw new Error(`Lỗi tạo embedding: ${error.message}`);
  }
}

/**
 * Xử lý document: đọc → chunk → embed → lưu DB
 * @param {string} docId - ID của document trong MongoDB
 * @param {string} filePath - Đường dẫn file
 * @param {string} mimeType - MIME type
 */
async function processDocument(docId, filePath, mimeType) {
  try {
    const text = await readFileContent(filePath, mimeType);
    if (!text || text.trim().length === 0) {
      throw new Error('File không có nội dung text.');
    }

    console.log(` Read document: ${text.length} characters`);

    const textChunks = splitIntoChunks(text);
    console.log(` Split into ${textChunks.length} chunks`);

    const embeddings = await createEmbeddings(textChunks);
    console.log(` Created ${embeddings.length} embeddings`);

    const chunks = textChunks.map((content, index) => ({
      content,
      chunkIndex: index,
      embedding: embeddings[index] || [],
    }));

    await KnowledgeBase.findByIdAndUpdate(docId, {
      chunks,
      totalChunks: chunks.length,
      status: 'ready',
    });

    console.log(` Document ${docId} processed successfully!`);
  } catch (error) {
    console.error(` Process document error:`, error.message);
    await KnowledgeBase.findByIdAndUpdate(docId, {
      status: 'error',
      errorMessage: error.message,
    });
  }
}

module.exports = { processDocument, splitIntoChunks, createEmbeddings };
