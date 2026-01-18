// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-publications",
          title: "publications",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-our-paper-asgnet-has-been-accepted-to-cvpr-2021",
          title: '🎉 Our paper “ASGNet” has been accepted to CVPR 2021!',
          description: "",
          section: "News",},{id: "news-two-papers-accepted-to-icip-2021",
          title: '🎉 Two papers accepted to ICIP 2021.',
          description: "",
          section: "News",},{id: "news-one-paper-accepted-to-pattern-recognition",
          title: '🎉 One paper accepted to Pattern Recognition!',
          description: "",
          section: "News",},{id: "news-joined-cdt-ras-phd-at-the-university-of-edinburgh",
          title: '🤖 Joined CDT-RAS PhD at The University of Edinburgh.',
          description: "",
          section: "News",},{id: "news-our-paper-superstylenet-has-been-accepted-to-bmvc-2021",
          title: '🎉 Our paper “SuperstyleNet” has been accepted to BMVC 2021.',
          description: "",
          section: "News",},{id: "news-our-paper-locate-has-been-accepted-to-cvpr-2023",
          title: '🎉 Our paper “LOCATE” has been accepted to CVPR 2023!',
          description: "",
          section: "News",},{id: "news-started-as-a-research-intern-at-huawei-noah-s-ark-lab-london",
          title: '💼 Started as a research intern at Huawei, Noah’s Ark Lab, London.',
          description: "",
          section: "News",},{id: "news-the-work-ooal-has-been-accepted-to-cvpr-2024",
          title: '🎉 The work “OOAL” has been accepted to CVPR 2024!',
          description: "",
          section: "News",},{id: "news-attended-icvss-2024-at-sicily-an-amazing-experience",
          title: '🌴 Attended ICVSS 2024 at Sicily, an amazing experience!',
          description: "",
          section: "News",},{id: "news-passed-my-third-year-phd-review-and-advanced-to-the-final-year",
          title: '📝 Passed my third-year PhD review and advanced to the final year!',
          description: "",
          section: "News",},{id: "news-one-paper-accepted-to-nmi-congrats-to-ruaridh",
          title: '🎉 One paper accepted to NMI, congrats to Ruaridh!',
          description: "",
          section: "News",},{id: "news-passed-my-phd-viva-with-minor-corrections",
          title: '🎓 Passed my PhD viva with minor corrections!',
          description: "",
          section: "News",},{id: "news-one-paper-accepted-to-iros-2025",
          title: '🎉 One paper accepted to IROS 2025.',
          description: "",
          section: "News",},{id: "news-two-papers-accepted-to-iccv-2025-see-you-in-hawaii",
          title: '🎉 Two papers accepted to ICCV 2025. See you in Hawaii!',
          description: "",
          section: "News",},{id: "news-started-my-new-position-as-a-postdoctoral-research-fellow-at-ntu",
          title: '💂 Started my new position as a Postdoctoral Research Fellow at NTU!',
          description: "",
          section: "News",},{id: "news-mask2iv-has-been-accepted-to-aaai-2026",
          title: '🎉 Mask2IV has been accepted to AAAI 2026.',
          description: "",
          section: "News",},{id: "projects-project-1",
          title: 'project 1',
          description: "with background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{id: "projects-project-2",
          title: 'project 2',
          description: "a project with a background image and giscus comments",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project/";
            },},{id: "projects-project-3-with-very-long-name",
          title: 'project 3 with very long name',
          description: "a project that redirects to another website",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project/";
            },},{id: "projects-project-4",
          title: 'project 4',
          description: "another without an image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project/";
            },},{id: "projects-project-5",
          title: 'project 5',
          description: "a project with a background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/5_project/";
            },},{id: "projects-project-6",
          title: 'project 6',
          description: "a project with no image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/6_project/";
            },},{id: "projects-project-7",
          title: 'project 7',
          description: "with background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/7_project/";
            },},{id: "projects-project-8",
          title: 'project 8',
          description: "an other project with a background image and giscus comments",
          section: "Projects",handler: () => {
              window.location.href = "/projects/8_project/";
            },},{id: "projects-project-9",
          title: 'project 9',
          description: "another project with an image 🎉",
          section: "Projects",handler: () => {
              window.location.href = "/projects/9_project/";
            },},{id: "projects-asgnet",
          title: 'ASGNet',
          description: "ASGNet for Few-Shot Segmentation (CVPR 2021)",
          section: "Projects",handler: () => {
              window.location.href = "/asgnet/";
            },},{id: "projects-locate",
          title: 'LOCATE',
          description: "LOCATE for Weakly Supervised Affordance Grounding (CVPR 2023)",
          section: "Projects",handler: () => {
              window.location.href = "/locate/";
            },},{id: "projects-ooal",
          title: 'OOAL',
          description: "One-Shot Open Affordance Learning with Foundation Models (CVPR 2024)",
          section: "Projects",handler: () => {
              window.location.href = "/ooal/";
            },},{id: "projects-template",
          title: 'template',
          description: "academic project page template",
          section: "Projects",handler: () => {
              window.location.href = "/template/";
            },},{id: "teachings-data-science-fundamentals",
          title: 'Data Science Fundamentals',
          description: "This course covers the foundational aspects of data science, including data collection, cleaning, analysis, and visualization. Students will learn practical skills for working with real-world datasets.",
          section: "Teachings",handler: () => {
              window.location.href = "/teachings/data-science-fundamentals/";
            },},{id: "teachings-introduction-to-machine-learning",
          title: 'Introduction to Machine Learning',
          description: "This course provides an introduction to machine learning concepts, algorithms, and applications. Students will learn about supervised and unsupervised learning, model evaluation, and practical implementations.",
          section: "Teachings",handler: () => {
              window.location.href = "/teachings/introduction-to-machine-learning/";
            },},{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
