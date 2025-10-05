window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "https://homes.cs.washington.edu/~kpar/nerfies/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}

$(document).ready(function() {
    // Navbar burger toggle
    $(".navbar-burger").click(function() {
        $(".navbar-burger").toggleClass("is-active");
        $(".navbar-menu").toggleClass("is-active");
    });

    // Initialize all carousels with per-element slidesToShow
    document.querySelectorAll('.carousel').forEach(el => {
        let slides = parseInt(el.dataset.slidesToShow) || 3; // default 3
        let options = {
            slidesToScroll: 1,
            slidesToShow: slides,
            loop: true,
            infinite: true,
            autoplay: false,
            autoplaySpeed: 3000,
        };

        let carouselInstance = bulmaCarousel.attach(el, options);

        // Optional: attach event listener
        if (carouselInstance && carouselInstance.length > 0) {
            carouselInstance[0].on('before:show', state => {
                console.log('Carousel state:', state);
            });
        }
    });

    // Preload interpolation images
    preloadInterpolationImages();

    // Interpolation slider
    $('#interpolation-slider').on('input', function(event) {
        setInterpolationImage(this.value);
    });
    setInterpolationImage(0);
    $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

    // Attach Bulma sliders
    bulmaSlider.attach();

    // Set video playback rates
    document.getElementById("single-task-result-video").playbackRate = 2.0;
    document.getElementById("multi-task-result-video").playbackRate = 2.0;
});
