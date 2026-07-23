@integration
Feature: Danh bạ đối tác vay/mượn
  # spec: docs/agentic-workflow/specs/2026-07-23-contact.md
  Là người cho vay và đi vay với những người cụ thể
  Tôi muốn quản lý họ như một danh bạ có định danh ổn định
  Để cùng một người dùng lại được cho nhiều khoản vay, và đổi tên một nơi là cập nhật mọi nơi

  @BR-contact-001
  Rule: Đối tác phải có tên hiển thị, không được để trống

    Scenario: Tạo đối tác với tên hợp lệ
      When người dùng tạo một đối tác với tên "Anh Minh"
      Then đối tác được lưu với một định danh mới do hệ thống sinh ra

    Scenario: Từ chối tạo đối tác khi tên bỏ trống
      When người dùng tạo một đối tác với tên chỉ gồm khoảng trắng
      Then hệ thống từ chối lưu và báo thiếu tên

    Scenario: Đổi tên đối tác sang một tên hợp lệ khác
      Given một đối tác đang có tên "Anh Minh"
      When người dùng đổi tên đối tác đó thành "Minh"
      Then tên mới được lưu lại

  @BR-contact-002
  Rule: Tên đối tác không bắt buộc phải là duy nhất

    Scenario: Cho phép hai đối tác trùng tên cùng tồn tại
      Given một đối tác tên "Anh" đã tồn tại
      When người dùng tạo thêm một đối tác khác cũng tên "Anh"
      Then cả hai cùng tồn tại như hai đối tác riêng biệt, mỗi người một định danh

  @BR-contact-003
  Rule: Đối tác có username tuỳ chọn, vừa để phân biệt trùng tên vừa làm định danh tài khoản

    Scenario: Tạo đối tác kèm username
      When người dùng tạo đối tác tên "Anh Minh" với username "minh_hsbc"
      Then cả tên và username đều được lưu

    Scenario: Tạo đối tác không có username
      When người dùng tạo đối tác chỉ có tên, không kèm username
      Then đối tác được lưu như một người chỉ có trong danh bạ, phần username để trống

    Scenario: Phân biệt hai người trùng tên nhờ username
      Given hai đối tác cùng tên "Anh", trong đó một người có username "anh_vcb"
      Then hai người đó vẫn phân biệt được với nhau nhờ username

  @BR-contact-004
  Rule: Có thể tạo đối tác ngay khi đang gán bên đối tác, và dùng được ngay

    Scenario: Tạo đối tác mới ngay trong lúc gán bên đối tác cho khoản vay
      Given người dùng đang xác định khoản vay này là với ai
      When người dùng tạo mới một đối tác tên "Chị Hoa" ngay tại đó
      Then đối tác được tạo và chọn được làm bên đối tác của khoản vay trong cùng thao tác

    Scenario: Chọn một đối tác đã có khi đang gán bên đối tác
      Given danh bạ đã có sẵn một số đối tác
      When người dùng tìm một đối tác theo tên hoặc username
      Then người dùng chọn được đối tác đó làm bên đối tác

  @BR-contact-005
  Rule: Định danh đối tác ổn định và bất biến qua mọi lần chỉnh sửa

    Scenario: Đổi tên không làm mất tham chiếu
      Given một bản ghi đang tham chiếu tới một đối tác
      When đối tác đó được đổi tên từ "Anh Minh" thành "Minh"
      Then bản ghi vẫn trỏ đúng đối tác đó và hiển thị tên mới "Minh"

    Scenario: Chỉnh sửa không sinh ra đối tác mới và không đổi định danh
      Given một đối tác đã tồn tại
      When người dùng sửa tên hoặc username của đối tác đó
      Then định danh của đối tác giữ nguyên và không có đối tác mới nào được tạo

  @BR-contact-006
  Rule: Đối tác có thể được lưu trữ và bỏ lưu trữ

    Scenario: Lưu trữ một đối tác
      Given một đối tác đang hoạt động
      When người dùng lưu trữ đối tác đó
      Then đối tác không còn nằm trong danh sách chọn, nhưng bản ghi vẫn được giữ

    Scenario: Bỏ lưu trữ một đối tác
      Given một đối tác đang bị lưu trữ
      When người dùng bỏ lưu trữ đối tác đó
      Then đối tác quay lại danh sách chọn

    Scenario: Đối tác bị lưu trữ vẫn giữ nguyên thông tin
      Given một đối tác đang bị lưu trữ
      Then tên và định danh của đối tác đó vẫn còn nguyên vẹn

  @BR-contact-007
  Rule: Đối tác không bị bản ghi nào tham chiếu thì được xoá vĩnh viễn

    Scenario: Xoá một đối tác không bị tham chiếu
      Given một đối tác không bị bản ghi nào tham chiếu tới
      When người dùng xoá đối tác đó
      Then đối tác bị xoá vĩnh viễn khỏi danh bạ

    Scenario: Định danh đã xoá không bị tái sử dụng
      Given một đối tác không bị tham chiếu vừa bị xoá
      Then định danh của đối tác đó không xuất hiện lại và không bị dùng lại cho người khác

  @BR-contact-008
  Rule: Đối tác đang bị tham chiếu không thể xoá cứng, chỉ có thể lưu trữ

    Scenario: Từ chối xoá cứng đối tác đang bị tham chiếu
      Given một đối tác đang được ít nhất một khoản vay tham chiếu
      When người dùng cố xoá cứng đối tác đó
      Then hệ thống ngăn xoá cứng và đề nghị lưu trữ thay thế

    Scenario: Lưu trữ đối tác đang bị tham chiếu vẫn giữ được lịch sử tên
      Given một đối tác đang được một khoản vay tham chiếu
      When người dùng lưu trữ đối tác đó
      Then các bản ghi tham chiếu vẫn hiển thị đúng tên, đối tác chỉ bị loại khỏi danh sách chọn

    Scenario: Không bao giờ âm thầm xoá đối tác còn bị tham chiếu
      Given một đối tác vẫn đang bị bản ghi khác trỏ tới định danh
      Then đối tác đó không bao giờ bị xoá âm thầm khi vẫn còn bản ghi trỏ tới

  @BR-contact-009
  Rule: Đối tác được xuất và nhập cùng workspace, giữ nguyên định danh

    Scenario: Danh bạ được khôi phục sau khi xuất rồi nhập lại
      Given workspace đang có một số đối tác
      When người dùng xuất workspace, xoá sạch, rồi nhập lại bản đã xuất
      Then tất cả đối tác trở lại với đúng định danh ban đầu

    Scenario: Tham chiếu vẫn hợp lệ sau khi nhập lại
      Given một bản ghi tham chiếu tới một đối tác trước khi xuất
      When workspace được nhập lại từ bản đã xuất
      Then bản ghi đó vẫn trỏ đúng đối tác như trước

  @BR-contact-010
  Rule: Bộ dữ liệu mẫu có sẵn vài đối tác demo

    Scenario: Workspace mới kèm dữ liệu mẫu thì có đối tác demo
      When người dùng khởi tạo một workspace mới cùng bộ dữ liệu mẫu
      Then một số đối tác demo có sẵn trong danh bạ

    Scenario: Workspace mới không kèm dữ liệu mẫu thì không có đối tác demo
      When người dùng khởi tạo một workspace mới không kèm bộ dữ liệu mẫu
      Then không có đối tác demo nào được tạo

  @BR-contact-011
  Rule: Tên đối tác dài tối đa 80 ký tự

    Scenario: Chấp nhận tên dài đúng giới hạn
      When người dùng lưu một đối tác có tên dài "80" ký tự sau khi bỏ khoảng trắng thừa
      Then đối tác được chấp nhận

    Scenario: Từ chối tên vượt quá giới hạn
      When người dùng lưu một đối tác có tên dài "81" ký tự
      Then hệ thống từ chối và báo tên vượt quá giới hạn độ dài

  @BR-contact-012
  Rule: Username của đối tác dài tối đa 30 ký tự

    Scenario: Chấp nhận username dài đúng giới hạn
      When người dùng lưu một đối tác có username dài "30" ký tự
      Then đối tác được chấp nhận

    Scenario: Từ chối username vượt quá giới hạn
      When người dùng lưu một đối tác có username dài "31" ký tự
      Then hệ thống từ chối và báo username vượt quá giới hạn độ dài

  # --- Phi chức năng (lane riêng, không trộn vào business rule) ---
  @NFR-contact-001
  Rule: Tên và username nhận đủ tiếng Việt có dấu, không hỏng qua lưu trữ và xuất/nhập

    Scenario: Giữ nguyên dấu tiếng Việt qua vòng xuất rồi nhập
      Given một đối tác tên "Nguyễn Thị Hoà" có username "hoa_vcb"
      When workspace được xuất rồi nhập lại
      Then tên và username của đối tác giữ nguyên dấu, không bị sai lệch ký tự
