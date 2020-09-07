console.log('Whiteboard extension loaded!');
console.log(chrome.extension.getURL("home/index.html"))


if (window.location.href.startsWith("https://elearning.utdallas.edu/webapps")) {
    start();
}

var id = "";
var email = "";

function start() {
    fetch(chrome.extension.getURL("loading.html"))
        .then(response => response.text())
        .then(template => {
            document.open()
            document.write(template)
            document.close()
        });

    console.log("Fetching your unique id...")
    fetch("https://elearning.utdallas.edu/webapps/blackboard/execute/personalInfo")
        .then(response => response.text())
        .then(result => getUserId(result))
        .catch(error => console.log('error', error));
}

function getUserId(result) {
    avatarid = result.match("key=(.*?), dataType=blackboard.data.user.User");
    console.log(avatarid);
    if (!avatarid || avatarid.length < 2) {
        console.log("Not logged in");
    } else {
        email = result.match("Email: (.*?@utdallas\\.edu)")[1];
        console.log(email);
        id = avatarid[1];
        replacePage();
    }
}

function replacePage() {
    var href = window.location.href;
    var replaceUrl = "home";
    var foundReplacement = true;
    var courseId = "";
    var contentId = "";

    if (href.startsWith("https://elearning.utdallas.edu/webapps/portal/execute/tabs/tabAction")) {
        replaceUrl = "home";
    } else if (href.startsWith("https://elearning.utdallas.edu/webapps/blackboard/content/listContent")) {
        if (href.includes("content_id")) {
            var courseAndContent = href.split("?")[1].split("&");

            // deals with external links switching course_id and content_id
            if (courseAndContent[0].includes("course_id")) {
                courseId = courseAndContent[0].split("=")[1];
                contentId = courseAndContent[1].split("=")[1];
            } else {
                courseId = courseAndContent[1].split("=")[1];
                contentId = courseAndContent[0].split("=")[1];
            }

            replaceUrl = "content";
        } else {
            courseId = href.split("?")[1].split("=")[1];
            replaceUrl = "course";
        }
    } else if (href.startsWith("https://elearning.utdallas.edu/webapps/blackboard/execute/announcement")) {
        courseId = href.split("?")[1].split("&");
        for (var id of courseId) {
            if (id.includes("course_id")) {
                courseId = id.split("=")[1];
                break;
            }
        }
        replaceUrl = "announcement";
    }
    else {
        foundReplacement = false;
    }

    if (foundReplacement) {
        fetch(chrome.extension.getURL(replaceUrl + "/index.html"))
            .then(function (response) {
                switch (response.status) {
                    case 200:
                        return response.text();
                    case 404:
                        throw response;
                }
            })
            .then(function (template) {
                if (replaceUrl === "home")
                    home(template);
                else if (replaceUrl === "course")
                    course(template, courseId);
                else if (replaceUrl === "content")
                    content(template, courseId, contentId);
                else if (replaceUrl === "announcement")
                    announcement(template, courseId);
            })
            .catch(function (response) {
                console.log(response.statusText);
            });
    }
}

// loads html from storage and puts in email 
function processTemplate(template) {
    document.open()
    document.write(template)
    document.close()
    var emailElement = document.getElementById("student-email");
    console.log(emailElement.innerText);
    emailElement.innerText = email;
}

// all courses
function home(template) {
    fetch("https://elearning.utdallas.edu/learn/api/public/v1/users/" + id + "/courses?availability.available=Yes&role=Student&expand=course").then(response => response.json()).then(data => {
        processTemplate(template);
        var res = "";
        var fetchArr = [];
        var courseArr = data.results;

        courseArr.sort(function(a, b) {
            return a.course.name > b.course.name ? 1 : a.course.name < b.course.name ? -1 : 0;
        });

        console.log('courseArr', courseArr)

        // add the "real" classes first
        for (var c of courseArr) {
            console.log(c);
            // NOTE: this could break if the 2208 pattern changes!
            if (!c.course.courseId.startsWith('2208-')) continue;

            console.log(c.course.courseid, c.course.name);
            var elements = document.querySelectorAll(".course");
            var element = elements[elements.length - 1];
            var newElement = null;
            if (element.querySelector(".courseTitle").textContent == "Sample") {
                newElement = element;
            } else {
                newElement = element.cloneNode(true);
            }
            newElement.querySelector(".courseTitle").textContent = c.course.name;
            newElement.querySelector(".courseContent").textContent = "Course content goes here";
            newElement.querySelector(".courseLink").href = "https://elearning.utdallas.edu/webapps/blackboard/content/listContent.jsp?course_id=" + c.course.id;
            element.insertAdjacentElement("afterend", newElement);
        }
        // add the other stuff at the bottom
        for (var c of courseArr) {
            console.log(c);
            // NOTE: this could break if the 2208 pattern changes!
            if (c.course.courseId.startsWith('2208-')) continue;

            console.log(c.course.courseid, c.course.name);
            var elements = document.querySelectorAll(".course");
            var element = elements[elements.length - 1];
            var newElement = null;
            if (element.querySelector(".courseTitle").textContent == "Sample") {
                newElement = element;
            } else {
                newElement = element.cloneNode(true);
            }
            newElement.querySelector(".courseTitle").textContent = c.course.name;
            newElement.querySelector(".courseContent").textContent = "Course content goes here";
            newElement.querySelector(".courseLink").href = "https://elearning.utdallas.edu/webapps/blackboard/content/listContent.jsp?course_id=" + c.course.id;
            element.insertAdjacentElement("afterend", newElement);
        }
    })
}

// load course contents
function course(template, courseId) {
    var courseName = "";
    fetch("https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId).then(response => response.json()).then(data => {
        courseName = data["name"]
        return fetch("https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId + "/contents").then(response => response.json());
    }).then(data => {
        processTemplate(template);
        document.getElementsByClassName("mdl-layout-title")[0].textContent = courseName;
        for (var res of data["results"]) {
            var elements = document.querySelectorAll(".content");
            var element = elements[elements.length - 1];
            var newElement = element.cloneNode(true);
            /* if (element.querySelector(".contentTitle").textContent == "Sample") {
                newElement = element;
            } else {
                newElement = element.cloneNode(true);
            }*/
            if (elements.length === 1) {
                element.querySelector(".contentLink").href = "https://elearning.utdallas.edu/webapps/blackboard/execute/announcement?course_id=" + courseId;
            }
            newElement.querySelector(".contentTitle").textContent = res.title;
            newElement.querySelector(".contentContent").textContent = "Content details goes here";
            newElement.querySelector(".contentLink").href = "https://elearning.utdallas.edu/webapps/blackboard/content/listContent.jsp?course_id=" + courseId + "&content_id=" + res.id;
            element.insertAdjacentElement("afterend", newElement);
        }
        return fetch("https://elearning.utdallas.edu/webapps/blackboard/content/courseMenu.jsp?course_id=" + courseId).then(response => response.text())
    }).then(html => {
        var xmlString = html;
        var doc = new DOMParser().parseFromString(xmlString, "text/html");
        var ul = doc.getElementById("courseMenuPalette_contents"); // => <a href="#">Link...
        var li = ul.getElementsByTagName("li");
        for(var i of li){
            var a = i.querySelector('a');
            console.log(a.textContent + ": " + a.href)
            var elements = document.querySelectorAll(".mdl-navigation__link");
            var element = elements[elements.length - 1];
            var newElement = element.cloneNode();
            newElement.href = a.href;
            newElement.textContent = a.textContent;
            element.insertAdjacentElement("afterend", newElement);
        }
    })
}

// load a content (can mean a lot of things! almost everything that is a "page" is a content)
function content(template, courseId, contentId) {
    var courseName = "";
    fetch("https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId).then(response => response.json()).then(data => {
        courseName = data["name"]
        return fetch("https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId + "/contents/" + contentId + "/children").then(response => response.json());
    }).then(data => {
        if ("results" in data) {
            // has children
            processTemplate(template);
            document.getElementsByClassName("mdl-layout-title")[0].textContent = courseName;
            for (var res of data["results"]) {
                var elements = document.querySelectorAll(".information");
                var element = elements[elements.length - 1];
                var newElement = null;
                if (element.querySelector(".informationTitle").textContent == "Sample") {
                    newElement = element;
                } else {
                    newElement = element.cloneNode(true);
                }
                newElement.querySelector(".informationTitle").textContent = res.title;
                newElement.querySelector(".informationContent").innerHTML = res.body;
                newElement.querySelector(".informationLink").href = "https://elearning.utdallas.edu/webapps/blackboard/content/listContent.jsp?course_id=" + courseId + "&content_id=" + res.id;
                element.insertAdjacentElement("afterend", newElement);
            }
        } else {
            // no children
            return fetch("https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId + "/contents/" + contentId).then(response => response.json()).then(data => {
                processTemplate(template);
                if ("title" in data) {
                    var elements = document.querySelectorAll(".information");
                    var element = elements[elements.length - 1];
                    element.querySelector(".informationTitle").textContent = data.title;
                    element.querySelector(".informationContent").innerHTML = data.body;
                    if ("contentHandler" in data && "url" in data["contentHandler"]) {
                        element.querySelector(".informationLink").href = data["contentHandler"]["url"];
                        element.querySelector(".informationLink").textContent = "External Link";
                    }
                    return fetch("https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId + "/contents/" + contentId + "/attachments")
                        .then(response => response.json()).then(attachments => {
                            // has attachments
                            if ("results" in attachments) {
                                for (var attach of attachments["results"]) {
                                    var links = document.querySelectorAll(".informationLinks");
                                    var link = links[links.length - 1];
                                    var newLink = null;
                                    if (link.querySelector(".informationLink").textContent == "Read More") {
                                        newLink = link;
                                    } else {
                                        newLink = link.cloneNode(true);
                                    }
                                    newLink.querySelector(".informationLink").href = "https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId + "/contents/" + contentId + "/attachments/" + attach.id + "/download";
                                    newLink.querySelector(".informationLink").textContent = "Attachment: " + attach.fileName;
                                    link.insertAdjacentElement("afterend", newLink);
                                }
                            }
                        })
                }
            })
        }
        return fetch("https://elearning.utdallas.edu/webapps/blackboard/content/courseMenu.jsp?course_id=" + courseId).then(response => response.text());
    }).then(html => {
        var xmlString = html;
        var doc = new DOMParser().parseFromString(xmlString, "text/html");
        var ul = doc.getElementById("courseMenuPalette_contents"); // => <a href="#">Link...
        var li = ul.getElementsByTagName("li");
        for(var i of li){
            var a = i.querySelector('a');
            console.log(a.textContent + ": " + a.href)
            var elements = document.querySelectorAll(".mdl-navigation__link");
            var element = elements[elements.length - 1];
            var newElement = element.cloneNode();
            newElement.href = a.href;
            newElement.textContent = a.textContent;
            element.insertAdjacentElement("afterend", newElement);
        }
    })
}

function announcement(template, courseId) {
    var courseName = "";
    fetch("https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId).then(response => response.json()).then(data => {
        courseName = data["name"]
        return fetch("https://elearning.utdallas.edu/learn/api/public/v1/courses/" + courseId + "/announcements").then(response => response.json());
    }).then(data => {
        processTemplate(template);
        document.getElementsByClassName("mdl-layout-title")[0].textContent = courseName;
        if ("results" in data) {
            for (var res of data["results"]) {
                var elements = document.querySelectorAll(".information");
                var element = elements[elements.length - 1];
                var newElement = null;
                if (element.querySelector(".informationTitle").textContent == "Sample") {
                    newElement = element;
                } else {
                    newElement = element.cloneNode(true);
                }
                newElement.querySelector(".informationTitle").textContent = res.title;
                newElement.querySelector(".informationContent").innerHTML = res.body;
                // newElement.querySelector(".contentLink").href = "https://elearning.utdallas.edu/webapps/blackboard/content/listContent.jsp?course_id=" + res.courseId;
                element.insertAdjacentElement("afterend", newElement);
            }
        }
        return fetch("https://elearning.utdallas.edu/webapps/blackboard/content/courseMenu.jsp?course_id=" + courseId).then(response => response.text());
    }).then(html => {
        var xmlString = html;
        var doc = new DOMParser().parseFromString(xmlString, "text/html");
        var ul = doc.getElementById("courseMenuPalette_contents"); // => <a href="#">Link...
        var li = ul.getElementsByTagName("li");
        for(var i of li){
            var a = i.querySelector('a');
            var elements = document.querySelectorAll(".mdl-navigation__link");
            var element = elements[elements.length - 1];
            var newElement = element.cloneNode();
            if(a){
                console.log(a.textContent + ": " + a.href)
                newElement.href = a.href;
                newElement.textContent = a.textContent;
            } else {
                newElement.href = "";
                newElement.textContent = "";
            }
            element.insertAdjacentElement("afterend", newElement);
            
        }
    })
}
