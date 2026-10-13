import { Language } from '../types';

export interface Translations {
  appName: string;
  appTagline: string;
  navSend: string;
  navReceive: string;
  navHistory: string;

  // Send
  sendTitle: string;
  sendSubtitle: string;
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  dropzoneLimit: string;
  chooseFiles: string;
  filesSelected: string;
  removeFile: string;
  totalSize: string;
  maxLimitWarning: string;

  textSectionTitle: string;
  textPlaceholder: string;
  statLines: string;
  statWords: string;
  statChars: string;
  clearText: string;
  copyText: string;
  textCopied: string;

  btnGenerateCode: string;
  btnUploading: string;
  sendSuccessTitle: string;
  sendSuccessSubtitle: string;
  yourTransferCode: string;
  copyCode: string;
  codeCopied: string;
  qrTitle: string;
  qrSubtitle: string;
  btnCopyLink: string;
  btnDownloadQr: string;
  btnSendAnother: string;
  expiresIn: string;

  // Receive
  receiveTitle: string;
  receiveSubtitle: string;
  cameraSectionTitle: string;
  btnOpenCamera: string;
  btnCloseCamera: string;
  btnSwitchCamera: string;
  cameraGuide: string;
  cameraPermissionNeeded: string;
  cameraRequesting: string;
  cameraError: string;
  cameraSuccessScan: string;

  manualCodeTitle: string;
  manualCodePlaceholder: string;
  btnConfirmReceive: string;
  searchingData: string;
  dataFoundTitle: string;
  selectAll: string;
  deselectAll: string;
  selectedCount: string;
  btnDownloadSelected: string;
  btnDownloadAllZip: string;
  downloadingZip: string;
  textReceivedTitle: string;

  previewBtn: string;
  previewModalTitle: string;
  previewClose: string;
  downloadSingle: string;

  // History / Status
  recentTransfers: string;
  noHistory: string;
  statusNotFound: string;
  statusExpired: string;
  statusError: string;
  badgeActive: string;
  badgeSent: string;
  badgeReceived: string;

  // Features list
  featureFast: string;
  featureLimit: string;
  featureQr: string;
  featureSecure: string;
}

export const translations: Record<Language, Translations> = {
  vi: {
    appName: 'RedDrop',
    appTagline: 'Chuyển dữ liệu siêu tốc & quét mã QR tức thì',
    navSend: 'Gửi dữ liệu',
    navReceive: 'Nhận dữ liệu',
    navHistory: 'Lịch sử truyền tải',

    sendTitle: 'Gửi dữ liệu & Tệp tin',
    sendSubtitle: 'Tải tệp tin lên đến 1.2GB hoặc nhập văn bản. Mã và QR code tạo ngay lập tức.',
    dropzoneTitle: 'Kéo thả tệp tin vào đây hoặc nhấp chuột để chọn',
    dropzoneSubtitle: 'Hỗ trợ tất cả định dạng: Ảnh, Video, Tài liệu, Nén, Mã nguồn',
    dropzoneLimit: 'Tối đa 1.2GB · Không giới hạn số lượng',
    chooseFiles: 'Chọn tệp tin',
    filesSelected: 'tệp đã chọn',
    removeFile: 'Xóa tệp',
    totalSize: 'Tổng dung lượng',
    maxLimitWarning: 'Dung lượng vượt quá giới hạn 1.2GB. Vui lòng giảm kích thước tệp.',

    textSectionTitle: 'Nhập văn bản chia sẻ trực tiếp',
    textPlaceholder: 'Nhập ghi chú, mã nguồn, liên kết hoặc tin nhắn cần truyền tải...',
    statLines: 'Số dòng',
    statWords: 'Số chữ',
    statChars: 'Ký tự',
    clearText: 'Xóa nội dung',
    copyText: 'Sao chép',
    textCopied: 'Đã sao chép vào bộ nhớ tạm!',

    btnGenerateCode: 'Tạo mã & QR chuyển dữ liệu',
    btnUploading: 'Đang chuẩn bị & Tải lên...',
    sendSuccessTitle: 'Tạo gói chuyển thành công!',
    sendSuccessSubtitle: 'Người nhận có thể quét mã QR dưới đây hoặc nhập mã xác nhận.',
    yourTransferCode: 'Mã nhận dữ liệu:',
    copyCode: 'Sao chép mã',
    codeCopied: 'Đã sao chép mã!',
    qrTitle: 'Mã QR chuyển nhận',
    qrSubtitle: 'Dùng camera hoặc ứng dụng quét mã QR để mở trực tiếp liên kết #code',
    btnCopyLink: 'Sao chép link nhận',
    btnDownloadQr: 'Tải mã QR (PNG)',
    btnSendAnother: 'Gửi gói dữ liệu khác',
    expiresIn: 'Hết hạn sau 24 giờ',

    receiveTitle: 'Nhận dữ liệu & Tệp tin',
    receiveSubtitle: 'Quét mã QR bằng camera trong khung vuông đỏ hoặc nhập mã để xác nhận.',
    cameraSectionTitle: 'Quét mã QR qua Camera',
    btnOpenCamera: 'Bật Camera quét mã',
    btnCloseCamera: 'Tắt Camera',
    btnSwitchCamera: 'Đổi Camera',
    cameraGuide: 'Đưa mã QR vào ngay khung hình vuông viền đỏ để nhận diện',
    cameraPermissionNeeded: 'Vui lòng cấp quyền truy cập camera để quét mã QR.',
    cameraRequesting: 'Đang yêu cầu quyền truy cập camera...',
    cameraError: 'Không thể truy cập camera hoặc thiết bị không hỗ trợ.',
    cameraSuccessScan: 'Đã quét mã QR thành công!',

    manualCodeTitle: 'Nhập mã để xác nhận',
    manualCodePlaceholder: 'Nhập mã chuyển (VD: RED-892 hoặc 6 số)',
    btnConfirmReceive: 'Xác nhận & Nhận dữ liệu',
    searchingData: 'Đang tìm kiếm dữ liệu trên máy chủ...',
    dataFoundTitle: 'Dữ liệu đã sẵn sàng tải về',
    selectAll: 'Chọn tất cả',
    deselectAll: 'Bỏ chọn',
    selectedCount: 'đã chọn',
    btnDownloadSelected: 'Tải xuống mục đã chọn',
    btnDownloadAllZip: 'Tải tất cả (.ZIP)',
    downloadingZip: 'Đang nén ZIP...',
    textReceivedTitle: 'Nội dung văn bản nhận được',

    previewBtn: 'Xem trước',
    previewModalTitle: 'Xem trước tệp tin',
    previewClose: 'Đóng',
    downloadSingle: 'Tải tệp này',

    recentTransfers: 'Gói chuyển gần đây trên trình duyệt',
    noHistory: 'Chưa có lịch sử gửi hoặc nhận nào.',
    statusNotFound: 'Không tìm thấy gói chuyển dữ liệu này hoặc mã không chính xác.',
    statusExpired: 'Gói chuyển dữ liệu đã hết hạn và bị xóa khỏi hệ thống.',
    statusError: 'Đã xảy ra lỗi khi kết nối. Vui lòng thử lại.',
    badgeActive: 'Khả dụng',
    badgeSent: 'Đã gửi',
    badgeReceived: 'Đã nhận',

    featureFast: 'Tốc độ cực nhanh không qua trung gian rườm rà',
    featureLimit: 'Hỗ trợ tệp lớn tối đa 1.2GB',
    featureQr: 'Quét camera thực tế với Deep Link #code',
    featureSecure: 'Tự động hủy sau thời gian bảo lưu',
  },
  en: {
    appName: 'RedDrop',
    appTagline: 'Ultra-fast data transfer with instant camera QR scanning',
    navSend: 'Send Data',
    navReceive: 'Receive Data',
    navHistory: 'Transfer History',

    sendTitle: 'Send Data & Files',
    sendSubtitle: 'Upload files up to 1.2GB or enter text. Code & QR code generated instantly.',
    dropzoneTitle: 'Drag and drop files here, or click to browse',
    dropzoneSubtitle: 'Supports all formats: Photos, Videos, Documents, Archives, Source code',
    dropzoneLimit: 'Up to 1.2GB · No file count limit',
    chooseFiles: 'Browse Files',
    filesSelected: 'files selected',
    removeFile: 'Remove',
    totalSize: 'Total Size',
    maxLimitWarning: 'Total size exceeds 1.2GB limit. Please reduce file payload.',

    textSectionTitle: 'Enter Text to Share',
    textPlaceholder: 'Enter notes, code snippets, links or messages to transfer...',
    statLines: 'Lines',
    statWords: 'Words',
    statChars: 'Characters',
    clearText: 'Clear Text',
    copyText: 'Copy Text',
    textCopied: 'Copied to clipboard!',

    btnGenerateCode: 'Generate Code & QR Code',
    btnUploading: 'Preparing & Uploading...',
    sendSuccessTitle: 'Transfer Ready!',
    sendSuccessSubtitle: 'The recipient can scan the QR code below or enter the 6-character code.',
    yourTransferCode: 'Transfer Code:',
    copyCode: 'Copy Code',
    codeCopied: 'Code copied!',
    qrTitle: 'Transfer QR Code',
    qrSubtitle: 'Use camera or any QR scanner to open directly via #code link',
    btnCopyLink: 'Copy Direct Link',
    btnDownloadQr: 'Download QR (PNG)',
    btnSendAnother: 'Send Another Transfer',
    expiresIn: 'Expires in 24 hours',

    receiveTitle: 'Receive Data & Files',
    receiveSubtitle: 'Scan QR with your camera in the red square frame or enter the code to confirm.',
    cameraSectionTitle: 'Camera QR Scanner',
    btnOpenCamera: 'Open Camera',
    btnCloseCamera: 'Close Camera',
    btnSwitchCamera: 'Switch Camera',
    cameraGuide: 'Align the QR code inside the red square frame',
    cameraPermissionNeeded: 'Please grant camera access to scan QR codes.',
    cameraRequesting: 'Requesting camera permission...',
    cameraError: 'Camera could not be accessed or is unavailable.',
    cameraSuccessScan: 'QR code successfully scanned!',

    manualCodeTitle: 'Or Enter Code to Confirm',
    manualCodePlaceholder: 'Enter code (e.g. RED-892 or 6 digits)',
    btnConfirmReceive: 'Confirm & Retrieve',
    searchingData: 'Searching for transfer data...',
    dataFoundTitle: 'Data Ready for Download',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    selectedCount: 'selected',
    btnDownloadSelected: 'Download Selected',
    btnDownloadAllZip: 'Download All (.ZIP)',
    downloadingZip: 'Compressing ZIP...',
    textReceivedTitle: 'Received Text Content',

    previewBtn: 'Preview',
    previewModalTitle: 'File Preview',
    previewClose: 'Close',
    downloadSingle: 'Download File',

    recentTransfers: 'Recent Transfers',
    noHistory: 'No transfer history yet.',
    statusNotFound: 'Transfer not found or code is incorrect.',
    statusExpired: 'This transfer has expired and was removed.',
    statusError: 'An error occurred while connecting. Please try again.',
    badgeActive: 'Active',
    badgeSent: 'Sent',
    badgeReceived: 'Received',

    featureFast: 'Ultra-fast transfer with zero friction',
    featureLimit: 'Large payload up to 1.2GB',
    featureQr: 'Live camera scanner & Deep Link #code',
    featureSecure: 'Auto-destructs after retention period',
  },
  ko: {
    appName: 'RedDrop',
    appTagline: '초고속 데이터 전송 및 실시간 QR 코드 스캔',
    navSend: '데이터 보내기',
    navReceive: '데이터 받기',
    navHistory: '전송 내역',

    sendTitle: '데이터 및 파일 전송',
    sendSubtitle: '최대 1.2GB 파일 업로드 및 텍스트 공유. 코드 및 QR 즉시 생성.',
    dropzoneTitle: '파일을 여기에 끌어다 놓거나 클릭하여 선택하세요',
    dropzoneSubtitle: '모든 형식 지원: 사진, 동영상, 문서, 압축 파일, 소스 코드',
    dropzoneLimit: '최대 1.2GB · 개수 무제한',
    chooseFiles: '파일 찾아보기',
    filesSelected: '개 파일 선택됨',
    removeFile: '삭제',
    totalSize: '총 크기',
    maxLimitWarning: '용량이 1.2GB 제한을 초과했습니다.',

    textSectionTitle: '직접 공유할 텍스트 입력',
    textPlaceholder: '메모, 코드, 링크 또는 메시지를 입력하세요...',
    statLines: '줄 수',
    statWords: '단어 수',
    statChars: '글자 수',
    clearText: '내용 지우기',
    copyText: '복사',
    textCopied: '클립보드에 복사되었습니다!',

    btnGenerateCode: '코드 및 QR 코드 생성',
    btnUploading: '업로드 중...',
    sendSuccessTitle: '전송 패키지 생성 완료!',
    sendSuccessSubtitle: '수신자가 아래 QR 코드를 스캔하거나 코드를 입력할 수 있습니다.',
    yourTransferCode: '수신 코드:',
    copyCode: '코드 복사',
    codeCopied: '코드가 복사되었습니다!',
    qrTitle: '전송 QR 코드',
    qrSubtitle: '카메라로 스캔하여 #code 링크로 즉시 열기',
    btnCopyLink: '수신 링크 복사',
    btnDownloadQr: 'QR 다운로드 (PNG)',
    btnSendAnother: '새 전송 시작',
    expiresIn: '24시간 후 만료',

    receiveTitle: '데이터 및 파일 받기',
    receiveSubtitle: '빨간색 사각형 프레임에 QR을 스캔하거나 코드를 입력하세요.',
    cameraSectionTitle: '카메라 QR 스캔',
    btnOpenCamera: '카메라 켜기',
    btnCloseCamera: '카메라 끄기',
    btnSwitchCamera: '카메라 전환',
    cameraGuide: '빨간색 사각 뷰파인더 안에 QR 코드를 맞춰주세요',
    cameraPermissionNeeded: '카메라 권한을 허용해 주세요.',
    cameraRequesting: '카메라 권한 요청 중...',
    cameraError: '카메라를 열 수 없거나 지원되지 않습니다.',
    cameraSuccessScan: 'QR 코드가 인식되었습니다!',

    manualCodeTitle: '확인 코드 직접 입력',
    manualCodePlaceholder: '코드 입력 (예: RED-892)',
    btnConfirmReceive: '확인 및 데이터 수신',
    searchingData: '데이터 검색 중...',
    dataFoundTitle: '다운로드할 데이터가 준비되었습니다',
    selectAll: '전체 선택',
    deselectAll: '선택 해제',
    selectedCount: '개 선택됨',
    btnDownloadSelected: '선택한 파일 다운로드',
    btnDownloadAllZip: '전체 다운로드 (.ZIP)',
    downloadingZip: 'ZIP 압축 중...',
    textReceivedTitle: '수신된 텍스트 내용',

    previewBtn: '미리보기',
    previewModalTitle: '파일 미리보기',
    previewClose: '닫기',
    downloadSingle: '이 파일 다운로드',

    recentTransfers: '최근 전송 기록',
    noHistory: '전송 기록이 없습니다.',
    statusNotFound: '전송 데이터를 찾을 수 없거나 코드가 올바르지 않습니다.',
    statusExpired: '데이터가 만료되어 삭제되었습니다.',
    statusError: '연결 중 오류가 발생했습니다.',
    badgeActive: '활성',
    badgeSent: '보냄',
    badgeReceived: '받음',

    featureFast: '중간 단계 없는 초고속 전송',
    featureLimit: '최대 1.2GB 대용량 지원',
    featureQr: '실제 카메라 스캔 및 #code 딥링크',
    featureSecure: '보관 기간 후 자동 파기',
  },
  ja: {
    appName: 'RedDrop',
    appTagline: '超高速データ転送＆リアルタイムQRコードスキャン',
    navSend: 'データ送信',
    navReceive: 'データ受信',
    navHistory: '転送履歴',

    sendTitle: 'データ＆ファイル送信',
    sendSubtitle: '最大1.2GBのファイルとテキストを瞬時に共有。コードとQRを即時発行。',
    dropzoneTitle: 'ここにファイルをドラッグ＆ドロップ、またはクリックして選択',
    dropzoneSubtitle: '全形式対応：写真、動画、文書、ZIP圧縮、ソースコード',
    dropzoneLimit: '最大1.2GB · ファイル数無制限',
    chooseFiles: 'ファイルを選択',
    filesSelected: '件のファイル選択中',
    removeFile: '削除',
    totalSize: '合計サイズ',
    maxLimitWarning: 'サイズが1.2GBの上限を超えています。',

    textSectionTitle: '共有テキストの入力',
    textPlaceholder: 'メモ、コード、リンク、メッセージを入力してください...',
    statLines: '行数',
    statWords: '単語数',
    statChars: '文字数',
    clearText: 'クリア',
    copyText: 'コピー',
    textCopied: 'クリップボードにコピーしました！',

    btnGenerateCode: 'コード＆QRコード生成',
    btnUploading: 'アップロード準備中...',
    sendSuccessTitle: '転送パッケージ作成完了！',
    sendSuccessSubtitle: '受取人はQRコードをスキャンするか、コードを入力して取得できます。',
    yourTransferCode: '受取コード:',
    copyCode: 'コードをコピー',
    codeCopied: 'コピーしました！',
    qrTitle: '転送用QRコード',
    qrSubtitle: 'カメラでスキャンして#codeリンクから直接開く',
    btnCopyLink: '受取リンクをコピー',
    btnDownloadQr: 'QR保存 (PNG)',
    btnSendAnother: '別のデータを送信',
    expiresIn: '24時間後に有効期限切れ',

    receiveTitle: 'データ＆ファイル受信',
    receiveSubtitle: '赤枠カメラでQRをスキャンするか、コードを入力して確認してください。',
    cameraSectionTitle: 'カメラQRスキャナー',
    btnOpenCamera: 'カメラを起動',
    btnCloseCamera: 'カメラを停止',
    btnSwitchCamera: 'カメラ切替',
    cameraGuide: '赤い四角い枠内にQRコードを合わせてください',
    cameraPermissionNeeded: 'カメラへのアクセスを許可してください。',
    cameraRequesting: 'カメラ権限を確認中...',
    cameraError: 'カメラにアクセスできないか、非対応です。',
    cameraSuccessScan: 'QRコードのスキャンに成功しました！',

    manualCodeTitle: 'コードを入力して確認',
    manualCodePlaceholder: 'コード入力（例: RED-892）',
    btnConfirmReceive: '確認して受信する',
    searchingData: 'データを検索中...',
    dataFoundTitle: '受信データが準備できました',
    selectAll: 'すべて選択',
    deselectAll: '選択解除',
    selectedCount: '件選択中',
    btnDownloadSelected: '選択項目を保存',
    btnDownloadAllZip: '一括保存 (.ZIP)',
    downloadingZip: 'ZIP圧縮中...',
    textReceivedTitle: '受信したテキスト内容',

    previewBtn: 'プレビュー',
    previewModalTitle: 'ファイルプレビュー',
    previewClose: '閉じる',
    downloadSingle: 'このファイルを保存',

    recentTransfers: '最近の転送履歴',
    noHistory: '転送履歴はありません。',
    statusNotFound: 'データが見つからないか、コードが誤っています。',
    statusExpired: '有効期限が切れたため削除されました。',
    statusError: '接続エラーが発生しました。',
    badgeActive: '有効',
    badgeSent: '送信済み',
    badgeReceived: '受信済み',

    featureFast: '無駄のない超高速ダイレクト転送',
    featureLimit: '大容量1.2GBまで対応',
    featureQr: 'カメラ実写スキャンと#codeディープリンク',
    featureSecure: '保管期間後の自動完全消去',
  },
  zh: {
    appName: 'RedDrop',
    appTagline: '极速数据传输与实时摄像头二维码扫描',
    navSend: '发送数据',
    navReceive: '接收数据',
    navHistory: '传输历史',

    sendTitle: '发送数据与文件',
    sendSubtitle: '支持最大 1.2GB 文件上传及文本共享，即时生成取件码与二维码。',
    dropzoneTitle: '拖放文件到此处，或点击浏览',
    dropzoneSubtitle: '支持所有格式：图片、视频、文档、压缩包、代码',
    dropzoneLimit: '最大 1.2GB · 不限制文件数量',
    chooseFiles: '选择文件',
    filesSelected: '个文件已选',
    removeFile: '移除',
    totalSize: '总大小',
    maxLimitWarning: '总大小超过 1.2GB 限制，请精简文件。',

    textSectionTitle: '输入分享文本内容',
    textPlaceholder: '输入备忘录、代码片段、链接或留言...',
    statLines: '行数',
    statWords: '字数',
    statChars: '字符数',
    clearText: '清空内容',
    copyText: '复制文本',
    textCopied: '已复制到剪贴板！',

    btnGenerateCode: '生成传输码与二维码',
    btnUploading: '正在准备并上传...',
    sendSuccessTitle: '传输包创建成功！',
    sendSuccessSubtitle: '接收方扫描下方二维码或输入 6 位取件码即可接收。',
    yourTransferCode: '取件码：',
    copyCode: '复制代码',
    codeCopied: '代码已复制！',
    qrTitle: '传输二维码',
    qrSubtitle: '使用手机相机或扫码应用扫描，通过 #code 链接直接打开',
    btnCopyLink: '复制提取链接',
    btnDownloadQr: '下载二维码 (PNG)',
    btnSendAnother: '发送新传输',
    expiresIn: '24小时后自动失效',

    receiveTitle: '接收数据与文件',
    receiveSubtitle: '在红色方形框内扫描二维码，或手动输入代码确认提取。',
    cameraSectionTitle: '摄像头扫描二维码',
    btnOpenCamera: '打开摄像头扫码',
    btnCloseCamera: '关闭摄像头',
    btnSwitchCamera: '切换摄像头',
    cameraGuide: '请将二维码对准红色方形框内',
    cameraPermissionNeeded: '请允许使用摄像头权限以扫描二维码。',
    cameraRequesting: '正在申请摄像头权限...',
    cameraError: '无法访问摄像头或设备不支持。',
    cameraSuccessScan: '二维码识别成功！',

    manualCodeTitle: '手动输入代码确认',
    manualCodePlaceholder: '输入代码（例如 RED-892 或 6位字符）',
    btnConfirmReceive: '确认并获取数据',
    searchingData: '正在检索数据...',
    dataFoundTitle: '数据已就绪可供下载',
    selectAll: '全选',
    deselectAll: '取消全选',
    selectedCount: '项已选',
    btnDownloadSelected: '下载所选项目',
    btnDownloadAllZip: '打包下载 (.ZIP)',
    downloadingZip: '正在打包压缩...',
    textReceivedTitle: '接收到的文本内容',

    previewBtn: '预览',
    previewModalTitle: '文件预览',
    previewClose: '关闭',
    downloadSingle: '下载此文件',

    recentTransfers: '近期传输记录',
    noHistory: '暂无传输记录。',
    statusNotFound: '未找到传输数据或代码错误。',
    statusExpired: '数据已过期并已清理。',
    statusError: '连接出错，请稍后重试。',
    badgeActive: '有效',
    badgeSent: '已发',
    badgeReceived: '已收',

    featureFast: '无冗余极速直传',
    featureLimit: '支持超大 1.2GB 数据',
    featureQr: '真机相机扫码与 #code 深度链接',
    featureSecure: '保留期满后自动销毁',
  },
};
