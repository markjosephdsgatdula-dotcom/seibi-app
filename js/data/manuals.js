/**
 * data/manuals.js — Maintenance Manual Data Store
 *
 * Contains step-by-step how-to instructions for all checklist items.
 * Supports bilingual (EN/JP) content and references step-specific images.
 */

'use strict';

const ManualStore = (() => {

  const MANUALS = [
    {
      linkedItemTitle: 'Clean welder rear filter',
      category: 'template-co2-mag',
      title_en: 'Clean Welder Rear Filter',
      title_jp: '溶接機裏側のフィルター清掃',
      steps: [
        { step: 1, text_en: 'Locate the air filter cover panel on the rear side of the welding power source cabinet.', text_jp: '溶接電源キャビネット背面にあるエアフィルターカバーパネルの位置を確認します。', image: 'images/manual/filter-step1.jpeg', safety_en: 'Ensure the welder power switch is OFF before touching the panels.', safety_jp: 'パネルに触れる前に、溶接機の電源スイッチがOFFになっていることを確認してください。' },
        { step: 2, text_en: 'Carefully slide or unscrew the filter cover and pull the mesh filter out of its slot.', text_jp: 'フィルターカバーを慎重にスライドさせるかネジを外し、スロットからメッシュフィルターを引き出します。', image: 'images/manual/filter-step2.jpeg' },
        { step: 3, text_en: 'Use clean compressed air (blow from the inside out) to remove all accumulated dust. Reinsert the filter and secure the cover.', text_jp: 'きれいな圧縮エアーを使用して（内側から外側に向けてブロー）、蓄積したほこりを除去します。フィルターを再挿入し、カバーを固定します。', image: 'images/manual/filter-step3.jpeg' }
      ]
    },
    {
      linkedItemTitle: 'Check startup noise & fans',
      category: 'template-co2-mag',
      title_en: 'Check Startup Noise & Fans',
      title_jp: '電源ON時の異音確認',
      steps: [
        { step: 1, text_en: 'Turn on the main power switch of the welding robot cabinet.', text_jp: '溶接ロボットキャビネットの主電源スイッチをONにします。', image: 'images/manual/sound-step1.jpeg' },
        { step: 2, text_en: 'Stand near the controller cabinet and listen to the cooling fans. Verify rotation is smooth and hum is normal.', text_jp: '制御キャビネットの近くに立ち、冷却ファンの音を聞きます。回転がスムーズで、うなり音が正常であることを確認します。', image: 'images/manual/sound-step2.jpeg', safety_en: 'Keep your ears at a safe distance from rotating blades.', safety_jp: '回転するファンの羽根から安全な距離を保ってください。' },
        { step: 3, text_en: 'Listen closely to the manipulator base joints during idle power. There should be no squeaking or metallic clicking.', text_jp: 'アイドル給電中のマニピュレータベース関節の音を近くで聞きます。きしみ音や金属的なクリック音がないことを確認します。', image: 'images/manual/sound-step3.jpeg' }
      ]
    },
    {
      linkedItemTitle: 'Test Emergency Stop Button',
      category: 'template-co2-mag',
      title_en: 'Test Emergency Stop Button',
      title_jp: '非常停止ボタンの作動確認',
      steps: [
        { step: 1, text_en: 'Power on the system and ensure the robot is in a safe standby state (no axis movement).', text_jp: 'システムの電源を入れ、ロボットが安全な待機状態（各軸が動いていない状態）にあることを確認します。', image: 'images/manual/estop-step1.jpeg' },
        { step: 2, text_en: 'Press the EMERGENCY STOP button on the Teach Pendant. Verify the servo power cuts off instantly and an E-stop alarm is triggered.', text_jp: 'ティーチペンダントの非常停止ボタンを押します。サーボ電源が瞬時に遮断され、非常停止アラームが作動することを確認します。', image: 'images/manual/estop-step2.jpeg' },
        { step: 3, text_en: 'Release the teach pendant E-stop button, reset the alarm, re-engage servos, and then press the emergency stop button on the front panel of the main controller cabinet.', text_jp: 'ペンダントの非常停止を解除してアラームをリセットし、サーボを再投入した後、制御キャビネット前面の非常停止ボタンを押します。', image: 'images/manual/estop-step3.jpeg' },
        { step: 4, text_en: 'Verify the servo power drops out immediately. Release the button, reset the system, and confirm it returns to normal standby.', text_jp: 'サーボ電源が直ちに遮断されることを確認します。ボタンを解除してシステムをリセットし、通常の待機状態に戻ることを確認します。', image: 'images/manual/estop-step4.jpeg', safety_en: 'Ensure no personnel are inside the safety gate during servo reset tests.', safety_jp: 'サーボのリセットテスト中、安全フェンス内に作業者が入っていないことを確認してください。' }
      ]
    },
    {
      linkedItemTitle: 'Verify Robot Alignment',
      category: 'template-co2-mag',
      title_en: 'Verify Robot Alignment',
      title_jp: 'ロボットと定盤の位置出し確認',
      steps: [
        { step: 1, text_en: 'Load the standard alignment verification program using the teach pendant.', text_jp: 'ティーチペンダントを使用して、標準の位置決め確認プログラムをロードします。', image: 'images/manual/alignment-step1.jpeg' },
        { step: 2, text_en: 'Run the program in step mode at low speed to jog the robot arm to calibration position A on the fixture table.', text_jp: '低速のステップ実行モードでプログラムを動かし、定盤上の校正位置Aにロボットアームを移動させます。', image: 'images/manual/alignment-step2.jpeg', safety_en: 'Set speed limit to 10% or lower and keep hands clear of the fixture during movements.', safety_jp: '移動速度制限を10%以下に設定し、ロボット作動中は定盤に手を近づけないでください。' },
        { step: 3, text_en: 'Jog to calibration positions B and C sequentially. Visually inspect the distance between the TCP pin and fixture alignment holes.', text_jp: '校正位置BおよびCに順次移動させます。TCP（ツール先端点）ピンと定盤の基準穴との間の距離を目視で検査します。', image: 'images/manual/alignment-step3.jpeg' },
        { step: 4, text_en: 'Confirm that alignment deviation is within tolerances (typically ±0.5 mm). Record alignment offset if adjustment is required.', text_jp: '位置ずれが許容範囲内（通常は±0.5 mm以内）であることを確認します。調整が必要な場合は、ズレ量を記録してください。', image: 'images/manual/alignment-step4.jpeg' }
      ]
    },
    {
      linkedItemTitle: 'Blow Air Inside Machine',
      category: 'template-co2-mag',
      title_en: 'Blow Air Inside Machine',
      title_jp: '溶接機内のエアブロー清掃',
      steps: [
        { step: 1, text_en: 'TURN OFF the main breaker powering the welding power source and perform safety lockout.', text_jp: '溶接電源を供給している主ブレーカーをOFFにし、安全なロックアウト作業を行います。', image: 'images/manual/airblow-step1.jpeg', safety_en: 'DANGER: Electrical shock hazard. Do not open panels with power connected.', safety_jp: '危険：感電の恐れがあります。電源が入った状態でパネルを開けないでください。' },
        { step: 2, text_en: 'Remove the side panel cover screws and take off the cabinet covers to expose internal circuitry.', text_jp: 'サイドパネルカバーのネジを外し、キャビネットカバーを取り外して内部回路を露出させます。', image: 'images/manual/airblow-step2.jpeg' },
        { step: 3, text_en: 'Using clean, dry compressed air (equipped with a static-safe nozzle), blow away accumulated metallic dust from heatsinks, power cards, and PCB components. Reassemble covers.', text_jp: '乾燥したきれいな圧縮空気（静電気防止ノズル付）を使用し、ヒートシンク、パワーカード、基板部品から蓄積した鉄粉等を吹き飛ばします。カバーを元に戻します。', image: 'images/manual/airblow-step3.jpeg' }
      ]
    },
    {
      linkedItemTitle: 'Clean Conduit Hose',
      category: 'template-co2-mag',
      title_en: 'Clean Conduit Hose',
      title_jp: 'コンジットホース内のアルコール清掃',
      steps: [
        { step: 1, text_en: 'Power OFF the system. Release tension on the wire feeder drive rolls and disconnect the conduit hose at both ends (feeder and torch connection).', text_jp: 'システムの電源をOFFにします。ワイヤ送給装置のドライブロールのテンションを解除し、コンジットホースの両端（送給装置側とトーチ側）を取り外します。', image: 'images/manual/conduit-step1.jpeg' },
        { step: 2, text_en: 'Soak a clean cleaning felt cylinder or cotton plug in industrial alcohol (IPA). Insert it into the feeder end of the conduit hose.', text_jp: 'きれいなクリーニング用フェルトまたは綿栓を工業用アルコール（IPA）に浸します。それをコンジットホースの送給装置側の端に挿入します。', image: 'images/manual/conduit-step2.jpeg', safety_en: 'Handle alcohol in a well-ventilated area. Avoid open flames.', safety_jp: 'アルコールは換気の良い場所で取り扱ってください。火気厳禁です。' },
        { step: 3, text_en: 'Place a receptacle at the torch end of the hose. Use compressed air nozzle to shoot the alcohol-soaked felt through the hose until it exits.', text_jp: 'ホースのトーチ側にお盆または受け皿を置きます。圧縮空気ノズルを使用して、アルコールが染み込んだフェルトをホースの反対側から飛び出すまで吹き通します。', image: 'images/manual/conduit-step3.jpeg' },
        { step: 4, text_en: 'Repeat with a dry felt until it comes out clean and white, showing no dark metal dust. Reconnect the conduit hose.', text_jp: '黒い鉄粉などの汚れが付着しなくなるまで、乾いたフェルトを何度も吹き通します。フェルトがきれいな状態になったら、コンジットホースを再接続します。', image: 'images/manual/conduit-step4.jpeg' }
      ]
    },
    {
      linkedItemTitle: 'Check gas leak',
      category: 'template-regulator',
      title_en: 'Check Gas Leak',
      title_jp: 'ガス漏れ確認',
      steps: [
        { step: 1, text_en: 'Open the primary gas cylinder valve to pressurize the regulator and downstream piping line.', text_jp: 'ガスボンベの主弁を開き、調整器（レギュレーター）および下流の配管ラインに圧力をかけます。', image: 'images/manual/gasleak-step1.jpeg' },
        { step: 2, text_en: 'Spray specialized gas leak detector spray (or soapy water solution) generously onto regulator connections, couplers, and hose connection joints.', text_jp: '調整器の接続部、カプラ、およびホースのジョイント部に、専用のガス漏れ検知スプレー（または石鹸水）を十分に吹き付けます。', image: 'images/manual/gasleak-step2.jpeg' },
        { step: 3, text_en: 'Observe joints closely for 30 seconds. If bubble formations appear, a leak is present. Wipe connections dry with a cloth after testing.', text_jp: '接続部分を30秒間よく観察します。泡が膨らんできたらガス漏れが発生しています。テスト後は布で接続部を拭き取って乾燥させてください。', image: 'images/manual/gasleak-step3.jpeg', safety_en: 'If a leak is found, shut off the gas valve immediately and tighten the joints.', safety_jp: '漏れが見つかった場合は、直ちにガスバルブを閉め、接続部を増し締めしてください。' }
      ]
    },
    {
      linkedItemTitle: 'Adjust and verify flow rate',
      category: 'template-regulator',
      title_en: 'Adjust & Verify Flow Rate',
      title_jp: '流量12L/min調整・動作確認',
      steps: [
        { step: 1, text_en: 'Engage gas check flow button to initiate continuous gas flow simulation.', text_jp: 'ガスチェックボタンを押して、シールドガスの連続送給シミュレーションを開始します。', image: 'images/manual/flow-step1.jpeg' },
        { step: 2, text_en: 'Look at the float ball inside the flowmeter tube. Turn the adjustment knob until the center of the ball aligns precisely with the 12 L/min mark.', text_jp: '流量計チューブ内のフロートボールを確認します。調整つまみを回して、ボールの中心が正確に12 L/minの目盛りに合うように調整します。', image: 'images/manual/flow-step2.jpeg' },
        { step: 3, text_en: 'Stop flow simulation and verify the float ball drops back to zero. Re-test to ensure flow rate returns stably to 12 L/min.', text_jp: '送給シミュレーションを停止し、フロートボールがゼロに戻ることを確認します。再テストを行い、流量が12 L/minに安定して復帰することを確認します。', image: 'images/manual/flow-step3.jpeg' }
      ]
    },
    {
      linkedItemTitle: 'Check gas pressure needle',
      category: 'template-utility-gas',
      title_en: 'Check Gas Pressure Needle',
      title_jp: 'ガス圧計ゲージの針確認',
      steps: [
        { step: 1, text_en: 'Access the outdoor gas cylinder manifold station located in the 1F Courtyard.', text_jp: '1F中庭にある屋外ガスボンベマニホールドステーションに向かいます。', image: 'images/manual/pressure-step1.jpeg', safety_en: 'Always wear a helmet and protective glasses when working in utility areas.', safety_jp: 'ユーティリティエリアでの作業時は、常にヘルメットと保護メガネを着用してください。' },
        { step: 2, text_en: 'Inspect the needle of the primary manifold pressure gauge. Verify that pressure is within the specified normal operating range. (If abnormal, notify Daimaru Enawin immediately).', text_jp: 'メインマニホールド圧力計の針を点検します。圧力が指定の正常動作範囲内にあることを確認します。（異常時は、直ちに大丸エナウィンに連絡してください）。', image: 'images/manual/pressure-step2.jpeg' }
      ]
    },
    {
      linkedItemTitle: 'Check welding ground cable',
      category: 'template-co2-mag',
      title_en: 'Check Welding Ground Cable',
      title_jp: 'アースケーブル接続部の緩み・腐食点検',
      steps: [
        { step: 1, text_en: 'Locate the grounding cable connected to the welding table and the power source.', text_jp: '溶接テーブルと電源に接続されているアースケーブルを確認します。', image: 'generic-check.png' },
        { step: 2, text_en: 'Inspect for any fraying, corrosion, or looseness at the bolt connections.', text_jp: 'ボルト接続部にほつれ、腐食、または緩みがないか確認します。', image: 'generic-check.png' },
        { step: 3, text_en: 'Tighten any loose bolts to ensure a solid electrical connection.', text_jp: 'しっかりとした電気接続を確保するために、緩んでいるボルトを締めます。', image: 'generic-check.png' }
      ]
    },
    {
      linkedItemTitle: 'Test torch shock sensor',
      category: 'template-co2-mag',
      title_en: 'Test Torch Shock Sensor',
      title_jp: 'トーチ衝突検知センサー動作テスト',
      steps: [
        { step: 1, text_en: 'Gently push the welding torch sideways to simulate a collision.', text_jp: '溶接トーチを横方向に軽く押し、衝突をシミュレートします。', image: 'generic-check.png' },
        { step: 2, text_en: 'Verify that the controller registers a collision alarm and halts the robot.', text_jp: 'コントローラーが衝突アラームを認識し、ロボットを停止させることを確認します。', image: 'generic-check.png' },
        { step: 3, text_en: 'Reset the shock sensor and clear the alarm on the teach pendant.', text_jp: 'ショックセンサーをリセットし、ティーチペンダントでアラームを解除します。', image: 'generic-check.png' }
      ]
    },
    {
      linkedItemTitle: 'Inspect gearbox grease leaks',
      category: 'template-co2-mag',
      title_en: 'Inspect Gearbox Grease Leaks',
      title_jp: '各軸減速機のグリス漏れ点検',
      steps: [
        { step: 1, text_en: 'Visually inspect the joints (J1 to J6) of the robot arm for any signs of grease or oil leakage.', text_jp: 'ロボットアームの各関節（J1〜J6）にグリスやオイルの漏れがないか目視で確認します。', image: 'generic-check.png' },
        { step: 2, text_en: 'Check the floor around the base for any drips.', text_jp: 'ベース周辺の床に液だれがないか確認します。', image: 'generic-check.png' }
      ]
    },
    {
      linkedItemTitle: 'Verify wire feed pressure (3.5)',
      category: 'template-co2-mag',
      title_en: 'Verify Wire Feed Pressure (3.5)',
      title_jp: '送給装置の送給圧調整（3.5に調整）',
      steps: [
        { step: 1, text_en: 'Check the pressure adjustment knob on the wire feeder.', text_jp: 'ワイヤ送給装置の圧力調整ノブを確認します。', image: 'generic-check.png' },
        { step: 2, text_en: 'Ensure the pressure indicator aligns with the 3.5 mark. Adjust if necessary.', text_jp: '圧力インジケータが3.5のマークに合っていることを確認します。必要に応じて調整してください。', image: 'generic-check.png' }
      ]
    },
    {
      linkedItemTitle: 'Verify joint alignment marks',
      category: 'template-co2-mag',
      title_en: 'Verify Joint Alignment Marks',
      title_jp: '各軸の合わせマーク（原点矢印）の一致確認',
      steps: [
        { step: 1, text_en: 'Move the robot to its programmed zero position (home).', text_jp: 'ロボットをプログラムされたゼロ位置（ホーム）に移動させます。', image: 'generic-check.png' },
        { step: 2, text_en: 'Visually verify that the physical alignment marks (arrows) on each joint match up perfectly.', text_jp: '各関節の物理的な合わせマーク（矢印）が完全に一致していることを目視で確認します。', image: 'generic-check.png' }
      ]
    },
    {
      linkedItemTitle: 'Visual check of mounting bolts',
      category: 'template-co2-mag',
      title_en: 'Visual Check of Mounting Bolts',
      title_jp: 'ロボット台座・取付ボルト緩みの目視点検',
      steps: [
        { step: 1, text_en: 'Perform a visual inspection of the bolts securing the robot base to the floor/pedestal.', text_jp: 'ロボットのベースを床またはペデスタルに固定しているボルトを目視検査します。', image: 'generic-check.png' },
        { step: 2, text_en: 'Look for rust rings or gaps that indicate loosening.', text_jp: '緩みを示す錆の輪や隙間がないか確認します。', image: 'generic-check.png' }
      ]
    },
    {
      linkedItemTitle: 'Sand & oil welding table',
      category: 'template-co2-mag',
      title_en: 'Sand & Oil Welding Table',
      title_jp: '定盤・溶接台の清掃（研磨・防錆油塗布）',
      steps: [
        { step: 1, text_en: 'Use a grinder or sander to remove spatter and rust from the welding table surface.', text_jp: 'グラインダーやサンダーを使用して、溶接台の表面からスパッタや錆を取り除きます。', image: 'generic-check.png', safety_en: 'Wear safety glasses and a dust mask.', safety_jp: '保護メガネと防塵マスクを着用してください。' },
        { step: 2, text_en: 'Wipe the table clean and apply a light coat of anti-rust oil.', text_jp: 'テーブルをきれいに拭き、防錆油を薄く塗布します。', image: 'generic-check.png' }
      ]
    },
    {
      linkedItemTitle: 'Replace encoder batteries (Power ON)',
      category: 'template-co2-mag',
      title_en: 'Replace Encoder Batteries (Power ON)',
      title_jp: '本体エンコーダ用バッテリー交換（通電中）',
      steps: [
        { step: 1, text_en: 'Ensure the robot controller is powered ON. DO NOT TURN OFF POWER, or origin data will be lost.', text_jp: 'ロボットコントローラーの電源がONになっていることを確認してください。電源をOFFにしないでください。原点データが失われます。', image: 'generic-check.png', safety_en: 'Replacing batteries while power is off will cause absolute position loss.', safety_jp: '電源OFF時にバッテリーを交換すると、絶対位置データが失われます。' },
        { step: 2, text_en: 'Locate the encoder battery compartment on the manipulator base.', text_jp: 'マニピュレーターベースにあるエンコーダーバッテリーボックスの位置を確認します。', image: 'generic-check.png' },
        { step: 3, text_en: 'Remove old batteries and install new ones, ensuring correct polarity.', text_jp: '古いバッテリーを取り外し、極性が正しいことを確認して新しいバッテリーを取り付けます。', image: 'generic-check.png' }
      ]
    },
    {
      linkedItemTitle: 'Replace CPU batteries (Power ON)',
      category: 'template-co2-mag',
      title_en: 'Replace CPU Batteries (Power ON)',
      title_jp: 'コントローラーCPU用バッテリー交換（通電中）',
      steps: [
        { step: 1, text_en: 'Ensure the robot controller is powered ON. DO NOT TURN OFF POWER.', text_jp: 'ロボットコントローラーの電源がONになっていることを確認してください。電源をOFFにしないでください。', image: 'generic-check.png', safety_en: 'Replacing batteries while power is off will cause memory loss.', safety_jp: '電源OFF時にバッテリーを交換すると、メモリデータが失われます。' },
        { step: 2, text_en: 'Open the controller cabinet and locate the CPU board battery.', text_jp: 'コントローラーキャビネットを開き、CPUボードのバッテリーの位置を確認します。', image: 'generic-check.png' },
        { step: 3, text_en: 'Carefully unclip the old battery and plug in the new one.', text_jp: '古いバッテリーのクリップを慎重に外し、新しいバッテリーを接続します。', image: 'generic-check.png' }
      ]
    }
  ];

  function getAll() {
    return MANUALS;
  }

  function getByTitle(title) {
    if (!title) return null;
    return MANUALS.find(m => m.linkedItemTitle.toLowerCase() === title.toLowerCase()) || null;
  }

  return { getAll, getByTitle };

})();
