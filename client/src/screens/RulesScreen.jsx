import { useApp } from '../context/AppContext';

export default function RulesScreen() {
  const { campaign } = useApp();
  const text =
    campaign?.termsText ||
    `• 18 yaş altı katılamaz.
• Ödül için kanal takibi ve yatırım şartı gerekir.
• Çoklu hesap diskalifiye sebebidir.
• Slotio kullanıcı adı doğru girilmelidir.
• Tahmin onaylandıktan sonra değiştirilemez.
• Organizasyon şüpheli katılımları iptal edebilir.`;

  return (
    <div>
      <h2>Etkinlik Kuralları</h2>
      <div className="card rules-card">
        {text.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}
