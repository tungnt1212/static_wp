console.log('home.js');

// const aosItems = document.getElementsByClassName("my-aos");

// for (let el of aosItems) {
//     el.classList.forEach(cls => {
//         if (cls.startsWith('aos-data')) {
//             var match, result = "", regex = /\((.*?)\)/g;
//             while (match = regex.exec(cls)) { result += match[1]; }
//             let res = result.split('+')
//             for (let item of res) {
//                 let arr = item.split("=")
//                 el.setAttribute(arr[0], arr[1])
//             }
            
//         }
//     })
// }

AOS.init();