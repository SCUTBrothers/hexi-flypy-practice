import { encode } from "./data";

type Scene = [string[], string[]];

function course(id: string, label: string, keys: string, scenes: Scene[]) {
  const sentences = scenes
    .flatMap(([starts, endings]) =>
      starts.flatMap((start) =>
        endings.map((ending) => {
          const [left, leftPy] = start.split("|");
          const [right, rightPy] = ending.split("|");
          const text = left + right + "。";
          const syllables = leftPy + " " + rightPy;
          const codes = syllables.split(" ").map(encode);
          if (
            codes.some((code) => code.length !== 2) ||
            codes.length !== left.length + right.length
          ) {
            throw new Error("无效的盲打课程拼音：" + text);
          }
          const presses = codes.join("");
          const hits = presses.split("").filter((key) => keys.includes(key)).length;
          return {
            id: "row-" + id + "-" + left + right,
            title: text.slice(0, -1),
            text,
            syllables,
            tag: label,
            description: "",
            hits,
            total: presses.length,
          };
        }),
      ),
    )
    .filter((sentence) => sentence.hits / sentence.total >= 0.7);
  return { id, label, keys, sentences };
}

export const ROW_COURSES = [
  course("home", "中排", "asdfghjkl", [
    [
      ["江上的风|jiang shang de feng", "海港的风|hai gang de feng", "山岗的风|shan gang de feng"],
      ["渐渐凉了|jian jian liang le", "还很大|hai hen da", "刚刚停下|gang gang ting xia"],
    ],
    [
      ["大家|da jia", "哥哥|ge ge", "刚来的客人|gang lai de ke ren"],
      [
        "打开了大门|da kai le da men",
        "赶上了早班车|gan shang le zao ban che",
        "看见山间的灯光|kan jian shan jian de deng guang",
      ],
    ],
    [
      ["江边的灯|jiang bian de deng", "大厅的灯|da ting de deng", "房间的灯|fang jian de deng"],
      [
        "渐渐亮了|jian jian liang le",
        "刚刚亮起来|gang gang liang qi lai",
        "亮了很久|liang le hen jiu",
      ],
    ],
    [
      ["寒风过后|han feng guo hou", "散场以后|san chang yi hou"],
      ["广场空荡荡的|guang chang kong dang dang de", "江岸安静下来|jiang an an jing xia lai"],
    ],
  ]),
  course("top", "上排", "qwertyuiop", [
    [
      ["我|wo", "琪琪|qi qi", "小玉|xiao yu"],
      [
        "取出一张书签|qu chu yi zhang shu qian",
        "说起去年的趣事|shuo qi qu nian de qu shi",
        "贴起一副春联|tie qi yi fu chun lian",
      ],
    ],
    [
      ["清晨|qing chen", "秋日里|qiu ri li", "一入秋|yi ru qiu"],
      [
        "微雨润湿石阶|wei yu run shi shi jie",
        "秋水映出树影|qiu shui ying chu shu ying",
        "水汽围住群山|shui qi wei zhu qun shan",
      ],
    ],
    [
      ["屋外|wu wai", "雨后|yu hou", "树梢上|shu shao shang"],
      [
        "一群秋雀起起落落|yi qun qiu que qi qi luo luo",
        "雨水一滴一滴落下|yu shui yi di yi di luo xia",
        "吹起一阵微风|chui qi yi zhen wei feng",
      ],
    ],
    [
      ["午休时|wu xiu shi", "入夜时|ru ye shi"],
      ["我轻轻推开屋门|wo qing qing tui kai wu men", "我取出一叠旧书|wo qu chu yi die jiu shu"],
    ],
  ]),
  course("bottom", "下排", "zxcvbnm", [
    [
      ["小猫|xiao mao", "白猫|bai mao", "那只花猫|na zhi hua mao"],
      [
        "走进草丛|zou jin cao cong",
        "悄悄走近小鸟|qiao qiao zou jin xiao niao",
        "钻进棉被|zuan jin mian bei",
      ],
    ],
    [
      ["小苗|xiao miao", "小白|xiao bai", "表妹|biao mei"],
      [
        "包好面包|bao hao mian bao",
        "笑着走进花园|xiao zhe zou jin hua yuan",
        "拿走半包草莓|na zou ban bao cao mei",
      ],
    ],
    [
      ["早班车|zao ban che", "那辆班车|na liang ban che", "末班车|mo ban che"],
      [
        "慢慢走远|man man zou yuan",
        "正走在小桥上|zheng zou zai xiao qiao shang",
        "载着乘客走了|zai zhe cheng ke zou le",
      ],
    ],
    [
      ["早春|zao chun", "年年春早|nian nian chun zao"],
      ["嫩草冒出泥面|nen cao mao chu ni mian", "小鸟衔草筑巢|xiao niao xian cao zhu chao"],
    ],
    [
      ["奶奶|nai nai", "小赵|xiao zhao"],
      ["在灶边煮面|zai zao bian zhu mian", "从早忙到晚|cong zao mang dao wan"],
    ],
  ]),
];

export type RowCourse = (typeof ROW_COURSES)[number];
