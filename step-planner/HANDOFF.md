# HANDOFF — việc dở của step-planner/

Làm xong mục nào thì xoá mục ấy.

## CHƯA LÀM

- Bằng chứng: tài liệu `proof` của cả bước chưa có dấu trên bảng (chỉ thẻ bước con có).
- Bàn giao: chưa có "hiện đầu ra của bước con ở cấp bước" (bước bàn giao lại đầu ra của bước con).
- Bàn giao: đầu vào chỉ chọn được đầu ra đã khai; chưa nhận link / tài liệu bên ngoài làm đầu vào.
- Bàn giao trên đường nối của System design (`design.edges`) chưa nối với bàn giao `outs` / `ins` trên bảng.
- Hai tab: bước được tạo lại ("Re-create") sau khi tab kia xoá không gắn lại các quyết định từng gắn với nó.
- Xoá một đầu ra trong hộp sửa rồi Save: nơi dùng mất đầu vào, không có Hoàn tác riêng (hộp đã báo "Used by").

## NỢ

- System design: chưa mở lại nguồn cho vài câu (kiểu dữ liệu Label Studio nhận, vì sao Streamlit không chạy trên Vercel); CVAT chưa có lệnh
  cài (không mở được trang cài). Lệnh chép từ quickstart có số phiên bản sẽ cũ nhanh: Superset, OpenSearch, faiss, tên model Ollama.
- System design: Hudi chưa có lệnh cài (lệnh pyspark của quickstart cần nhiều `--conf`); connector Starburst của Power BI chưa thử với
  Trino mã nguồn mở; Data Studio mới đối chiếu connector PostgreSQL, BigQuery. MinIO bản cộng đồng: xem lại khi có bản phát hành hay fork mới.
- System design: câu `gpu` hỏi về huấn luyện, nhưng vài `fit` của host / serve dùng nó như GPU lúc phục vụ.
- System design: Apply path chỉ ưu tiên công cụ của nhóm kiến trúc xử lý (PLAN-037). Nhóm storage chưa dùng: big-data-ds lối pipeline ra kho thô R2,
  kho ClickHouse (của kiến trúc streaming), chưa ra S3 / Delta, Trino của lakehouse. Thêm nhóm storage thì bỏ nhóm layers (medallion đẩy MinIO cho mọi pipeline).
- Dự án lớn (15 × 20, ghi chú 30 dòng), CPU chậm 4×: khung hình kéo thả lúc ô thả đổi chỗ còn ~50–80 ms (vẽ và xếp lớp
  cả trang). `content-visibility: auto` trên `.cards-scroll` giảm nửa số khung hình chậm, nhưng hàng khuất thì phải đo thẻ cắt
  khi hàng hiện ra (`markCutCards` đang ép dàn trang cả hàng khuất). Tắt Compact, xoá ô tìm vẫn dàn lại cả bảng.
- Chưa thử trên điện thoại thật: bàn phím ảo che hộp sửa dạng sheet (`dvh` không co theo bàn phím trên iOS).
- Chưa thử trên điện thoại thật: giữ thẻ rồi kéo (chặn cuộn bằng `touchmove` non-passive), tự cuộn khi kéo gần mép.
- Chưa thử trên điện thoại thật và screen reader: dòng "Next waits on", bộ lọc, bằng chứng, bàn giao, System design.
- Hai tab: Hoàn tác xoá bên giao (gắn lại bằng `insBackup`) mới kiểm bằng `test-core.mjs`, chưa bấm hai tab thật.
- Sơ đồ System design: ở 1280px chỉ còn 3 cột (khoảng cách cột nới ra cho nhãn bàn giao).
- Mẫu `data-pipeline`: chỉ kiểm tên khâu qua mục lục sách (Reis & Housley); bước con chưa đối chiếu với chữ trong sách.
  Ba yếu tố của DataOps trong sách chưa ghi vì chưa mở được nguồn.
- Mẫu `it5425-sports`: pha P7 có 7 đầu vào; đầu ra của P0 chưa nơi nào dùng. Xem lại khi trang đồ án đổi.
- Mẫu `big-data-ds`: sách Lambda (Marz & Warren, 2015) chưa mở được; mô tả Lambda đối chiếu với bài giảng của môn.
- Mẫu CRISP-DM: thẻ TDSP (Customer Acceptance), Model Cards, Datasheets for Datasets chưa mở lại được nguồn để kiểm.
- Danh mục System design: luật `non-streamlit-ui-on-streamlit-cloud`, `api-on-streamlit-cloud` suy từ câu "create, deploy,
  and manage your Streamlit apps", tài liệu không viết thẳng "chỉ chạy app Streamlit"; luật nhắc Metabase cần máy chủ riêng chưa mở lại trang.

## CHỜ CHỦ TRANG

- Ngôn ngữ: đoạn giải thích đầu mỗi phần của hộp System design (`js/ui/design.js`, dòng `lang: vi`) và chữ của việc System design
  sinh ra (`js/core/design-plan.js`) đang giữ tiếng Việt, coi là lời giải thích / nội dung. Có muốn chúng tiếng Anh như chữ giao diện không?
- Toast "Add evidence" hiện mỗi lần một thẻ có "Done when" (mọi thẻ CRISP-DM) sang Done mà chưa có bằng chứng: có thể ồn.
  Có cần một công tắc tắt gợi ý này không?
- Luật `free-host-sleeps` ghi Render "dậy mất khoảng một phút": là thời gian, không phải giá hay hạn mức; có hợp luật
  "không ghi số" của danh mục không?
- Luật GPU trên host không có GPU: chưa thêm vì tài liệu Streamlit Community Cloud, Render không nói rõ. Có cần không?
