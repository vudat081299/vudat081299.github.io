/* Sổ đăng ký loại file và bộ tô màu (MDAN-066): dữ liệu, không logic (tra ở core/file-type.js, nạp ở ui/highlight.js).
   Markdown tô Source bằng core/tokens.js (có sẵn trong trang); ngôn ngữ khác tô bằng highlight.js 11.9.0, mỗi ngôn ngữ
   một module ES trên cdnjs, chỉ tải khi có file hay khối rào của nó. Thêm ngôn ngữ: một dòng trong LANGS, in bằng
   node md-annotate/tools/hl-lang.mjs <id>.
   Xuất: CORE_SRI, HLJS, LANGS.
   Dùng: không module nào. */

export var HLJS = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/es/';
export var CORE_SRI = 'sha384-nhKFTE0p1v7w4VPdiCXEuAKBuGnZRjVarChm69kITyFj/Dfcu1U9oxHOtcCDQVWe';   // core.min.js

/* id của highlight.js (file languages/<id>.min.js): [tên khác: đuôi file, tên khối rào, tên file không đuôi;
   integrity của file; ngôn ngữ nhúng nạp kèm, khi phần nhúng là nội dung chính]. */
export var LANGS = {
  bash: ['sh zsh', 'sha384-jq1fKOKuZud8ipjshrCh4KB1NERe/+1fdksI04v7A/lXjb3/8Rz0nR9/jwBlTmZY'],
  c: ['h', 'sha384-G7WtwjMBNGrPly3ZsbPhfnT0v88hG3Ea9fQhrSWfzj7cNAsXsU7EKMQLyLGj7vTH'],
  cpp: ['cc c++ h++ hpp hh hxx cxx', 'sha384-wm7mUd/Qh4vfF/WEg88/R6WXSI/dIh+I5Ng0sgZ+0Pfg956wqTS1BPzAFBomI3/1'],
  csharp: ['cs c#', 'sha384-huUb4Ol37G1WrtGV7bn1UArXcJSjD4tQswMGzgpNZYAPxR74MHTqW79z1dXWMvhk'],
  css: ['', 'sha384-lt+tmYaOzXx9MmAecQ5yQIclKAWSYC5cYi6wxnfEX2wR5WmdhW1+ahpdu+/Ka5JN'],
  diff: ['patch', 'sha384-OIJrZgyhN1E6e29B9M3gFPtkR5JgXpls8h5D2bNzBxQ8Ncwxzfjedu3/0jZEe7S9'],
  go: ['golang', 'sha384-27jMAcMfx5pzlW2ntRUz1R22f43tLLOnYyDHss8iJBUi23iVzYrxbwQKY+LPU35B'],
  graphql: ['gql', 'sha384-sYfgkTuyw8lkHmGdVV7Mw1/C2jkRl3ZKZrSceJsMaqZAG2RNed+pSOfjwMMEIBO7'],
  ini: ['toml cfg conf', 'sha384-LDu6uT3diI3jBUJtdoGFa787cYlVrR+aqFfmW+kW+TImOkpVe+P5LBdDzydIHo9Z'],
  java: ['jsp', 'sha384-coaxfgI2lKuDqSxfMlfyPq5WM0THaLGyATZHzaFMrWdIbPcLdduuItTe6AmT/m33'],
  javascript: ['js jsx mjs cjs', 'sha384-eGsBtetyKPDKaLiTnxTzhSzTFM6A/yjHBQIj4rAMVaLPKW5tJb8U6XLr/AikCPd+'],
  json: ['jsonc json5', 'sha384-+DT7AtubDhVDciRc6CgjJJRsCt0L8NC3Dh8n9Tj2tZWU8rWxDIj1ViubmUDn8OCY'],
  kotlin: ['kt kts', 'sha384-mfmdbPhLobPr5OJzSXlWHDQDymRYyzedurWjJBvKVhlQGE+Jz/pN3D9lPEBIkDK2'],
  less: ['', 'sha384-hcTAUmAPcLa6fhkSwRgJpVDvoVF9afjydQiXyQYPDyFKTn4bATMWaseBh36/7wU7'],
  lua: ['', 'sha384-wvrGnUzHwJzO9dWQFF2DxrFjkSPw5gmc0iOQYmJUzeZ4tqa+15VEFRCH4GI2DNF3'],
  makefile: ['mk mak make', 'sha384-aUXBqKsjOzPD/W+hccF21KKWmWts/CrY/lWGJU+dAcsKtuh1/XtyDnzfLmqy/fV1'],
  markdown: ['md mkdown mkd mdx', 'sha384-SqGSUq0DMQ0OUQnQnTuVDCJyhANd/MFNj+0PF67S+VXgHpR8A4tPsf/3GoSFRmrx'],
  objectivec: ['mm objc obj-c obj-c++ objective-c++', 'sha384-eSkOKizj8aZA0WJaMmTJA3uqUtTkbZ7PXAADzDquzxCLyb1BMNgF9cn7/FIu0wFR'],
  perl: ['pl pm', 'sha384-HN/8Qf4NvPiUakM8jkY+R/WaNf5uDeDa80fK/VDjoi9huy+nhUzrTcWCFDjNUrGI'],
  php: ['', 'sha384-6Znh5S5q9F0hGNMtdaihFL3RJeMqL1a/UecjgzaBrhoxe4sjd5aiEOgokt7blhSW'],
  'php-template': ['', 'sha384-dGJwrvnfo/JaY0lSDtJuhB6XXPmL9hSqOnIYndlN0eE1PoA9FFxd+VtaSfcacNDA', 'xml php'],
  python: ['py gyp ipython pyi', 'sha384-rpBTxqcMTDMGwLGTQeWiHl2lU2e8jPaiRl9k8L0T1VAQRlzj7vHGDk7zO+dfQ4y8'],
  'python-repl': ['pycon', 'sha384-sW9zIYfNc+qN/lya5oAmIdFlVbXjPLcdYkPSdRMpxO/xI2jbDW/Q4Etvx02DFOmf', 'python'],
  r: ['', 'sha384-T5hv8+GOm2ni1B0cuZtt+8T0cIMH1CTycc9OQQH0GLcIQhmeBosyhcmcIv4r/1ag'],
  ruby: ['rb gemspec podspec thor irb', 'sha384-O4a+vELXT191NhKLE3TR5WQwDmQZ2izAhb2zETRxcPSXr6CJruqJ4a+GJpDlaqCF'],
  rust: ['rs', 'sha384-R+AmncR/y/QwiCROx1hLg1nFTQWR/07Yj4jBb3dhTFzINFaRfhpkB8G5+J4aIkrq'],
  scss: ['', 'sha384-kgS8WQ5/fDJ7xH5h1sT4IbnIn7mJZ7RExzG5Td2d8GuVg7DhFoiijDcC8HTxJs2B'],
  shell: ['console shellsession', 'sha384-RKUoelG22/D7BV/bNpoGLNzdTgWRf/ACQX7y4BGyIzK6E+xUoXtm68WNQW2tSW8X', 'bash'],
  sql: ['', 'sha384-8G3qMPeOeXVKZ0wGzMQHgMVQWixLw3EXFAcU+IFNLRe0WoZB5St3L3ZLTK62Nzns'],
  swift: ['', 'sha384-lJj3aAxzUpdk8StXN5j3OP20/Loadv+t8jYdMBYVqCaxtLHTpBUalFDsTPkC9Fov'],
  typescript: ['ts tsx mts cts', 'sha384-HHgazax8ozQ9RDWlJQyaFzaTk/OgTFRVHH+lcaYInkE8wVu5fnpkqkB3KUdzKcvE'],
  vbnet: ['vb', 'sha384-LdqDRVWxc7cPE2ISZcBIeHoQAyfnXmEArz0layp8fOjceievL8eX9cV+HgneOkQ4'],
  wasm: ['', 'sha384-FlAOV+6BVjUyajzW4twmqUvHxDYallf5jw5FewMZmsBHBuiJ/CJj1NZhNT1fHuzT'],
  xml: ['html xhtml rss atom xjb xsd xsl plist wsf svg htm', 'sha384-yFd3InBtG6WtAVgIl6iIdFKis8HmMC7GbbronB4lHJq3OLef3U8K9puak6MuVZqx', 'css javascript'],
  yaml: ['yml', 'sha384-MwRFV0kWo2NtUY8PZBaqrbQuA/FB7ouS40j2CKvHWA2W+ODg9LKjrxXWIlRekoVS'],
  scala: ['', 'sha384-5KqbJwOue0VrSIbMNJrkRcBOzNPBxlGPbrTdH/biCYczeCVi0Ethcg+fr1RXfH8i'],
  groovy: ['', 'sha384-tgywtm20fLQUu0uIXBr5KDIjyHpfZuyM4zKiakHHNsi9zinDSqPIr/FVjREnEWmY'],
  gradle: ['', 'sha384-+ilwPpCDudisnRgBeI+XBD7X3bLGw6EZnosF/W6iT/5YyGn0Qwjef5JIZXBkdrnr'],
  dart: ['', 'sha384-uieyxXCuKHe7O9+gaoPS12wjInN2v7cKQZSKKCcm7mwSDZf5UidK7G4iMHvbZKRe'],
  julia: ['', 'sha384-NqyA97ZywXJCu5WG4NiDyJRAYm5L2aGPPTeGnRSfkEtK8Lch/likdativWWAbLUs'],
  elixir: ['ex exs', 'sha384-B1unRJpfius4v1CDo8bNYlnKYL4h9uC7uhSE+fTC4WNSZwBHfHbD47N2bFBurjFF'],
  erlang: ['erl', 'sha384-qLpZFl0uFVtxGDLGp2q2g5PEgEgt78MggMr+BKUdDtRioP5Uw6RrYO7VzUheZ3ti'],
  haskell: ['hs', 'sha384-HPIAyvou0DrFHYTekBAbUaQ3UbjeD/WEEJ31SYlgvnEQP54tky7yggE8xQqdfLk0'],
  ocaml: ['ml', 'sha384-sm+3C97241bDJHul+IONVgYeQJcwtSN2wo1kUa1K0mNWY6MPMJnrx1giFrUr2MNY'],
  fsharp: ['fs f#', 'sha384-B1ZRrYmfEhHwYo+zuVPZpMfzy6cQt14Vvsbz0ZgQaJfZotA1AjdYP0C+zvN39Czh'],
  clojure: ['clj edn', 'sha384-trRP8CnzW/SSG6kXpTUGPBhUS/tOwRQ992lsIs6/zZ9FueaoJeINicKwxLLVIZKV'],
  powershell: ['pwsh ps ps1', 'sha384-pBczxETXXX/Ne92jpBviT47DPiv27FLNtvs0aMZH3W7rYXdwgf1gWg3pH4NmNC2V'],
  dos: ['bat cmd', 'sha384-Lr5UvDlMpLCSLEdIc9Jbe7lSHTs1UqFkGAwkacIOzl/Vx34B82LFi+2CeClz1zC/'],
  cmake: ['cmake.in', 'sha384-O4LQvDBqImUEPey0HB0Cg3aMyXEf/P4KYm+7uDjqqeU0+ciFh6wEQd3jkRbLD7G7'],
  latex: ['tex', 'sha384-dDJ50ltJ9VlfSOzSORI0KSNPcRIpLy1J0BmtdQGXBEY+7f57DAx754HVffzmWqC2'],
  protobuf: ['proto', 'sha384-93TO3rpvKyXqikneOt71cSHkxWQWPKaa6n00Me0j5Fzvjb7j+EjURqbZHyqx8m8T'],
  nix: ['nixos', 'sha384-CtpjUU5MhTp9rxGLye3LiXoBtSBotmKHW9N21wn0Jn945bxMFslJAhlPUb4GUGA8'],
  dockerfile: ['docker', 'sha384-DQdaFTXRCa9EQdAkBCHnMAhAomUgizSpJPmuCzoaDJMAshvgxlJF5d7J/ysvc6f/', 'bash']
};
