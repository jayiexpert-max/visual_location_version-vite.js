-- Fix Rack 5 Level 2 box order (Box1 left, Box2 right)
UPDATE `boxes` SET `position_in_level` = 1 WHERE `id` = 12 AND `box_code` = '1';
UPDATE `boxes` SET `position_in_level` = 2 WHERE `id` = 10 AND `box_code` = '2';
