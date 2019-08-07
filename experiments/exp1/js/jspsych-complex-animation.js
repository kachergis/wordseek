/**
 * jsPsych plugin for showing animated scenes with audio 
 * and recording screen clicks
 * George Kachergis
 * documentation: docs.jspsych.org
 */

jsPsych.plugins["complex-animation"] = (function() {

  var plugin = {};

  jsPsych.pluginAPI.registerPreload('complex-animation', 'stimuli', 'image');

  plugin.info = {
    name: 'complex-animation',
    description: '',
    parameters: {
      stimuli: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Stimuli',
        default: undefined,
        array: true,
        description: 'The sequence of images to be displayed.'
      },
      scene_html: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Scene HTML',
        default: '',
        array: true,
        description: 'HTML in which the animated stimulus (class=agent) is embedded.'
      },
      frame_time: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Frame time',
        default: 250,
        description: 'Duration to display each image.'
      },
      frame_isi: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Frame gap',
        default: 0,
        description: 'Length of gap to be shown between each image.'
      },
      sequence_reps: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Sequence repetitions',
        default: 1,
        description: 'Number of times to show entire sequence.'
      },
      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Choices',
        default: undefined,
        array: true,
        description: 'Class of images that should be clickable as responses.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below stimulus.'
      },
      audio: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Audio',
        default: null,
        description: 'Array of audio file names to be played as animation changes.'
      }
    }
  }

  var hello = new Audio('sounds/Bear_hello.mp3');
  hello.play();

  plugin.trial = function(display_element, trial) {

    var interval_time = trial.frame_time + trial.frame_isi;
    var animate_frame = -1;
    var reps = 0;
    var startTime = (new Date()).getTime();
    var animation_sequence = [];
    var responses = [];
    var current_stim = "";

    var animate_interval = setInterval(function() {
      var showImage = true;
      display_element.innerHTML = trial.scene_html; //''; // clear everything
      animate_frame++;
      if (animate_frame == trial.stimuli.length) {
        $('.bag').on({
           'click': function(){
               // get id of bag clicked on, and store data
               var id = $(this).attr('id');
               console.log("Clicked bag " + id);
               //$(this).css('border', "solid 2px red"); 
               $(this).hide(); 
               // (wait 500ms?) and bye-bye agent
               $('.agent').attr('src','images/Bear_disappear.png');
               setTimeout(function(){ 
                  after_response(id);
                  endTrial(); 
               }, 1000);
            }
        });

        animate_frame = 0;
        reps++;
        if (reps >= trial.sequence_reps) {
          //endTrial();
          clearInterval(animate_interval);
          showImage = false;
        }
      }
      if (showImage) {
        show_next_frame();
      }
    }, interval_time);


    function show_next_frame() {
      // show image
      //display_element.innerHTML = '<img src="'+trial.stimuli[animate_frame]+'" id="jspsych-animation-image"></img>';

      // replace agent with next image
      $('.agent').attr('src',trial.stimuli[animate_frame]);

      current_stim = trial.stimuli[animate_frame];

      // record when image was shown
      animation_sequence.push({
        "stimulus": trial.stimuli[animate_frame],
        "time": (new Date()).getTime() - startTime
      });

      if (trial.prompt !== null) {
        display_element.innerHTML += trial.prompt[animate_frame];
      }

      if (trial.frame_isi > 0) {
        jsPsych.pluginAPI.setTimeout(function() {
          display_element.querySelector('#jspsych-animation-image').style.visibility = 'hidden';
          current_stim = 'blank';
          // record when blank image was shown
          animation_sequence.push({
            "stimulus": 'blank',
            "time": (new Date()).getTime() - startTime
          });
        }, trial.frame_time);
      }
    }

    var after_response = function(bag) {
      responses.push({
        bag_clicked: bag
      });
    }

    function endTrial() {

      var trial_data = {
        "animation_sequence": JSON.stringify(animation_sequence),
        "responses": JSON.stringify(responses)
      };

      jsPsych.finishTrial(trial_data);
    }
  };

  return plugin;
})();
