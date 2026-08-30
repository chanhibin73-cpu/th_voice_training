/**
 * TH Voice Training - 会員登録 & メール送信 API (Vercel Serverless Function)
 * * GitHubのディレクトリルートに `api/register.js` として配置します。
 */

// インメモリデータストア (本番環境ではSupabase/Firebase/PostgreSQL等を推奨)
const registeredUsers = new Set(['demo@th-voice.com']);

export default async function handler(req, res) {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'お名前とメールアドレスは必須項目です。' 
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. 重複登録チェック
    if (registeredUsers.has(normalizedEmail)) {
      return res.status(400).json({ 
        success: false, 
        message: 'このメールアドレスは既に登録されています。' 
      });
    }

    // 2. ユーザー保存
    registeredUsers.add(normalizedEmail);

    // 3. 自動返信メールの送信 (Resend / SendGrid 等のAPIと連携可能)
    const emailResult = await sendWelcomeEmail(name, normalizedEmail);

    return res.status(200).json({
      success: true,
      message: '会員登録が正常に完了しました。',
      emailSent: emailResult.success,
      user: { name, email: normalizedEmail }
    });

  } catch (error) {
    console.error('Registration API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'サーバー内部エラーが発生しました。' 
    });
  }
}

/**
 * 登録完了メール送信処理
 */
async function sendWelcomeEmail(name, email) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  // APIキー未設定時は開発用ダミー応答
  if (!RESEND_API_KEY) {
    console.log(`[Development Mailer] Welcome email sent to: ${email} (${name})`);
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TH Voice Training <noreply@th-voice.com>',
        to: [email],
        subject: '【TH Voice Training】無料会員登録が完了しました！',
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2>${name} 様</h2>
            <p>オンライン無料ボイストレーニング「TH Voice Training」へのご登録ありがとうございます！</p>
            <p>マイページより「音域・目標カルテ」を設定いただくと、あなた専用のトレーニングメニューやプロ講師・AIへの質問機能をご利用いただけます。</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">※本メールにお心当たりがない場合は破棄してください。</p>
          </div>
        `
      })
    });

    return { success: response.ok };
  } catch (err) {
    console.error('Mail sending error:', err);
    return { success: false, error: err.message };
  }
}
