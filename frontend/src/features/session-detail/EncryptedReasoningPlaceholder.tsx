import styles from './EncryptedReasoningPlaceholder.module.css'

interface EncryptedReasoningPlaceholderProps {
  checksum?: string
  length?: number
}

const EncryptedReasoningPlaceholder = ({ checksum, length }: EncryptedReasoningPlaceholderProps) => {
  return (
    <div className={styles.placeholder}>
      <p className={styles.title}>暗号化された reasoning がマスクされています</p>
      <ul className={styles.metaList}>
        {length ? <li>暗号化データ長: 約 {length.toLocaleString('ja-JP')} 文字</li> : null}
        {checksum ? <li>ハッシュ: {checksum}</li> : null}
      </ul>
      <p className={styles.explanation}>
        このセグメントは暗号化されたまま提供されているため、内容を表示できません。詳細を確認するには復号済みデータをアップロードしてください。
      </p>
    </div>
  )
}

export default EncryptedReasoningPlaceholder

